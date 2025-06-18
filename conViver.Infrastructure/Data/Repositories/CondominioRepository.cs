using conViver.Core.Entities;
using conViver.Infrastructure.Data.Contexts;

namespace conViver.Infrastructure.Data.Repositories;

public class CondominioRepository : Repository<Condominio>
{
    public CondominioRepository(ConViverDbContext context) : base(context)
    {
    }
}
