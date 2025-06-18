using conViver.Core.Entities;
using conViver.Core.Interfaces;
using conViver.Core.Enums;
using Microsoft.EntityFrameworkCore;

namespace conViver.Application;

public class ReservaService
{
    private readonly IRepository<Reserva> _reservas;

    public ReservaService(IRepository<Reserva> reservas)
    {
        _reservas = reservas;
    }

    public async Task<IEnumerable<Reserva>> AgendaAsync(DateTime mesAno, CancellationToken ct = default)
    {
        return await _reservas.Query()
            .Where(r => r.Inicio.Month == mesAno.Month && r.Inicio.Year == mesAno.Year)
            .ToListAsync(ct);
    }

    public async Task<Reserva> CriarAsync(Guid unidadeId, string area, DateTime inicio, DateTime fim, CancellationToken ct = default)
    {
        var reserva = new Reserva
        {
            Id = Guid.NewGuid(),
            UnidadeId = unidadeId,
            Area = area,
            Inicio = inicio,
            Fim = fim
        };

        await _reservas.AddAsync(reserva, ct);
        await _reservas.SaveChangesAsync(ct);
        return reserva;
    }

    public async Task AtualizarStatusAsync(Guid id, string status, CancellationToken ct = default)
    {
        var reserva = await _reservas.GetByIdAsync(id, ct);
        if (reserva == null) throw new InvalidOperationException("Reserva nao encontrada");
        if (Enum.TryParse<ReservaStatus>(status, true, out var st))
            reserva.Status = st;
        reserva.UpdatedAt = DateTime.UtcNow;
        await _reservas.UpdateAsync(reserva, ct);
        await _reservas.SaveChangesAsync(ct);
    }

    public async Task ExcluirAsync(Guid id, CancellationToken ct = default)
    {
        var reserva = await _reservas.GetByIdAsync(id, ct);
        if (reserva == null) return;
        await _reservas.DeleteAsync(reserva, ct);
        await _reservas.SaveChangesAsync(ct);
    }
}

