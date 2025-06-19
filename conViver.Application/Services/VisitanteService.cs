using conViver.Core.Entities;
using conViver.Core.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace conViver.Application;

public class VisitanteService
{
    private readonly IRepository<Visitante> _visitantes;

    public VisitanteService(IRepository<Visitante> visitantes)
    {
        _visitantes = visitantes;
    }

    public Task<List<Visitante>> ListarAsync(DateTime? from = null, DateTime? to = null, CancellationToken ct = default)
    {
        var query = _visitantes.Query();
        if (from != null)
            query = query.Where(v => v.DataChegada >= from);
        if (to != null)
            query = query.Where(v => v.DataChegada <= to);
        return query.OrderByDescending(v => v.DataChegada).ToListAsync(ct);
    }
}
