using BCrypt.Net;
using conViver.Core.Entities;
using conViver.Core.Interfaces;
using Microsoft.EntityFrameworkCore;
using conViver.Core.DTOs; // Added
using System; // Added
using System.Collections.Generic; // Added
using System.Linq; // Added
using System.Security.Cryptography; // Added for token generation
using System.Threading; // Added
using System.Threading.Tasks; // Added


namespace conViver.Application.Services; // Changed namespace to match plan, if needed, or keep existing conViver.Application

public class UsuarioService : IUsuarioService
{
    private readonly IRepository<Usuario> _usuarioRepository;

    public UsuarioService(IRepository<Usuario> usuarioRepository)
    {
        _usuarioRepository = usuarioRepository;
    }

    public Task<Usuario?> GetByEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        return _usuarioRepository.Query()
            .FirstOrDefaultAsync(u => u.Email.ToLower() == email.ToLower(), cancellationToken);
    }

    // This method was present in the original file but not in IUsuarioService from previous step.
    // It returns entity. The new one for the interface returns DTO.
    // public Task<Usuario?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    // {
    //    return _usuarioRepository.GetByIdAsync(id, cancellationToken);
    // }

    public async Task AddAsync(Usuario usuario, CancellationToken cancellationToken = default)
    {
        usuario.SenhaHash = BCrypt.Net.BCrypt.HashPassword(usuario.SenhaHash);
        await _usuarioRepository.AddAsync(usuario, cancellationToken);
        await _usuarioRepository.SaveChangesAsync(cancellationToken); // Assuming SaveChangesAsync is on IRepository
    }

    public Task<bool> ValidatePasswordAsync(Usuario usuario, string senha)
    {
        return Task.FromResult(BCrypt.Net.BCrypt.Verify(senha, usuario.SenhaHash));
    }

    // Implementation for IUsuarioService.GetUsuarioByIdAsync
    public async Task<UsuarioResponse?> GetUsuarioByIdAsync(Guid id, CancellationToken ct = default)
    {
        var usuario = await _usuarioRepository.GetByIdAsync(id, ct);
        if (usuario == null) return null;

        return new UsuarioResponse
        {
            Id = usuario.Id,
            Nome = usuario.Nome, // Added mapping
            Email = usuario.Email,
            Perfil = usuario.Perfil.ToString(),
            UnidadeId = usuario.UnidadeId, // Added mapping
            Ativo = usuario.Ativo // Added mapping
        };
    }

    // Implementation for IUsuarioService.GetUnidadesIdDoUsuarioAsync
    public async Task<IEnumerable<Guid>> GetUnidadesIdDoUsuarioAsync(Guid usuarioId, CancellationToken ct = default)
    {
        var usuario = await _usuarioRepository.GetByIdAsync(usuarioId, ct);

        // Usuario.UnidadeId is now a non-nullable Guid.
        // If user exists and UnidadeId is not Guid.Empty (which it shouldn't be if FK is enforced
        // and data is consistent), return it.
        if (usuario != null && usuario.UnidadeId != Guid.Empty)
        {
            return new List<Guid> { usuario.UnidadeId };
        }
        return Enumerable.Empty<Guid>();
    }

    public async Task SolicitarResetSenhaAsync(string email, CancellationToken cancellationToken = default)
    {
        var usuario = await GetByEmailAsync(email, cancellationToken);

        if (usuario != null)
        {
            // Generate a cryptographically secure unique reset token
            var token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
            usuario.PasswordResetToken = token;
            usuario.PasswordResetTokenExpiry = DateTime.UtcNow.AddHours(1); // Token valid for 1 hour

            // Update the user in the repository
            await _usuarioRepository.UpdateAsync(usuario, cancellationToken);
            await _usuarioRepository.SaveChangesAsync(cancellationToken);

            // Simulate sending an email
            Console.WriteLine($"Simulating email sending to: {usuario.Email}");
            Console.WriteLine($"Password Reset Token: {token}");
            // In a real application, you would use an email service here.
            // e.g., await _emailService.SendPasswordResetEmailAsync(usuario.Email, token);
        }
        // If user is null, do nothing. The controller will return a generic message.
    }

    public async Task<bool> ResetarSenhaAsync(string resetToken, string novaSenha, CancellationToken cancellationToken = default)
    {
        var usuario = await _usuarioRepository.Query()
            .FirstOrDefaultAsync(u => u.PasswordResetToken == resetToken, cancellationToken);

        if (usuario == null || usuario.PasswordResetTokenExpiry == null || usuario.PasswordResetTokenExpiry <= DateTime.UtcNow)
        {
            return false; // Token not found, or expired
        }

        usuario.SenhaHash = BCrypt.Net.BCrypt.HashPassword(novaSenha);
        usuario.PasswordResetToken = null;
        usuario.PasswordResetTokenExpiry = null;
        usuario.UpdatedAt = DateTime.UtcNow;

        await _usuarioRepository.UpdateAsync(usuario, cancellationToken);
        await _usuarioRepository.SaveChangesAsync(cancellationToken);

        return true;
    }
}

