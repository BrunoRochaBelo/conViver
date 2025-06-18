using conViver.Core.Entities;

namespace conViver.Core.Interfaces;

public interface IUsuarioService
{
    Task<Usuario?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);
    Task AddAsync(Usuario usuario, CancellationToken cancellationToken = default);
    Task<bool> ValidatePasswordAsync(Usuario usuario, string senha);
}
