using conViver.Core.Entities;
using conViver.Core.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace conViver.Application;

public class EncomendaService
{
    private readonly IRepository<Encomenda> _encomendas;

    public EncomendaService(IRepository<Encomenda> encomendas)
    {
        _encomendas = encomendas;
    }

    public Task<List<Encomenda>> ListarAsync(string? status = null, CancellationToken ct = default)
    {
        var query = _encomendas.Query();
        if (!string.IsNullOrWhiteSpace(status))
        {
            if (status.Equals("recebida", StringComparison.OrdinalIgnoreCase))
                query = query.Where(e => e.RetiradoEm == null);
            else if (status.Equals("retirada", StringComparison.OrdinalIgnoreCase))
                query = query.Where(e => e.RetiradoEm != null);
        }
        return query.OrderByDescending(e => e.RecebidoEm).ToListAsync(ct);
    }
}
