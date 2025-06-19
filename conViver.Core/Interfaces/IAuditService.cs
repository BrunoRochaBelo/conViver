using conViver.Core.Entities;
using System.Threading;
using System.Threading.Tasks;

namespace conViver.Core.Interfaces;

public interface IAuditService
{
    Task RegistrarAsync(LogAuditoria log, CancellationToken ct = default);
}
