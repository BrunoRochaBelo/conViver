using conViver.Core.Interfaces;
using Microsoft.EntityFrameworkCore;
using conViver.Infrastructure.Data.Contexts;

namespace conViver.Infrastructure.Data.Repositories;

public class Repository<T> : IRepository<T> where T : class
{
    protected readonly ConViverDbContext _context;
    protected DbSet<T> Db => _context.Set<T>();

    public Repository(ConViverDbContext context)
    {
        _context = context;
    }

    public IQueryable<T> Query() => Db.AsQueryable();

    public async Task<T?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await Db.FindAsync(new object?[] { id }, cancellationToken);
    }

    public async Task AddAsync(T entity, CancellationToken cancellationToken = default)
    {
        await Db.AddAsync(entity, cancellationToken);
    }

    public Task UpdateAsync(T entity, CancellationToken cancellationToken = default)
    {
        Db.Update(entity);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(T entity, CancellationToken cancellationToken = default)
    {
        Db.Remove(entity);
        return Task.CompletedTask;
    }

    public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return _context.SaveChangesAsync(cancellationToken);
    }
}
