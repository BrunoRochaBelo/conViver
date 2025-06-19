using conViver.Core.Entities;
using conViver.Core.DTOs; // Added for UserDto
using System; // Added for Guid
using System.Collections.Generic; // Added for IEnumerable
using System.Threading; // Added for CancellationToken
using System.Threading.Tasks; // Added for Task

namespace conViver.Core.Interfaces;

public interface IUsuarioService
{
    Task<Usuario?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);
    Task AddAsync(Usuario usuario, CancellationToken cancellationToken = default);
    Task<bool> ValidatePasswordAsync(Usuario usuario, string senha);
    Task<UsuarioResponse?> GetUsuarioByIdAsync(Guid id, CancellationToken ct = default); // Changed UserDto to UsuarioResponse
    Task<IEnumerable<Guid>> GetUnidadesIdDoUsuarioAsync(Guid usuarioId, CancellationToken ct = default);
    Task SolicitarResetSenhaAsync(string email, CancellationToken cancellationToken = default);
    Task<bool> ResetarSenhaAsync(string resetToken, string novaSenha, CancellationToken cancellationToken = default);
}
