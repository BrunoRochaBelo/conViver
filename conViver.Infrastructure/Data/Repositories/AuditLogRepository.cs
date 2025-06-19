using System.Threading;
using System.Threading.Tasks;
using conViver.Core.Entities;
using conViver.Core.Interfaces;
using conViver.Infrastructure.Data.Contexts;

namespace conViver.Infrastructure.Data.Repositories;

public class AuditLogRepository : Repository<LogAuditoria>, IAuditService
{
    public AuditLogRepository(ConViverDbContext context) : base(context) { }

    public Task RegistrarAsync(LogAuditoria log, CancellationToken ct = default)
    {
        Db.Add(log);
        return _context.SaveChangesAsync(ct);
    }
}
