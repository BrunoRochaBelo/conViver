using conViver.Core.Entities;
using conViver.Infrastructure.Data.Contexts;

namespace conViver.Infrastructure.Data.Repositories;

public class UsuarioRepository : Repository<Usuario>
{
    public UsuarioRepository(ConViverDbContext context) : base(context)
    {
    }
}
