using BCrypt.Net;
using conViver.Core.Entities;
using conViver.Core.Interfaces;
using Microsoft.EntityFrameworkCore;
using conViver.Core.DTOs; // Added
using System; // Added
using System.Collections.Generic; // Added
using System.Linq; // Added
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

        return new UsuarioResponse {
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
}

