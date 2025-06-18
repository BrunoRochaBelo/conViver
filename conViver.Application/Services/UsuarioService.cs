using BCrypt.Net;
using conViver.Core.Entities;
using conViver.Core.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace conViver.Application;

public class UsuarioService : IUsuarioService
{
    private readonly IRepository<Usuario> _usuarios;

    public UsuarioService(IRepository<Usuario> usuarios)
    {
        _usuarios = usuarios;
    }

    public Task<Usuario?> GetByEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        return _usuarios.Query()
            .FirstOrDefaultAsync(u => u.Email.ToLower() == email.ToLower(), cancellationToken);
    }

    public async Task AddAsync(Usuario usuario, CancellationToken cancellationToken = default)
    {
        usuario.SenhaHash = BCrypt.Net.BCrypt.HashPassword(usuario.SenhaHash);
        await _usuarios.AddAsync(usuario, cancellationToken);
        await _usuarios.SaveChangesAsync(cancellationToken);
    }

    public Task<bool> ValidatePasswordAsync(Usuario usuario, string senha)
    {
        return Task.FromResult(BCrypt.Net.BCrypt.Verify(senha, usuario.SenhaHash));
    }
}

