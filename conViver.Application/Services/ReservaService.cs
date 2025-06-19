using conViver.Core.Enums;
using conViver.Core.Entities;
using conViver.Core.Interfaces;
using conViver.Core.DTOs;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace conViver.Application.Services;

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

    public async Task<IEnumerable<AgendaReservaDto>> GetAgendaAsync(Guid condominioId, DateTime mesAno, CancellationToken ct = default)
    {
        var list = await AgendaAsync(mesAno, ct);
        return list.Select(r => new AgendaReservaDto
        {
            Id = r.Id,
            AreaComumId = r.Area,
            Inicio = r.Inicio,
            Fim = r.Fim,
            Status = r.Status.ToString(),
            UnidadeId = r.UnidadeId,
            TituloReserva = r.Area
        });
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

    public Task<Reserva> SolicitarAsync(Guid condominioId, Guid usuarioId, ReservaInputDto dto, CancellationToken ct = default)
        => CriarAsync(dto.UnidadeId, dto.AreaComumId, dto.Inicio, dto.Fim, ct);

    public async Task AtualizarStatusAsync(Guid id, string status, CancellationToken ct = default)
    {
        var reserva = await _reservas.GetByIdAsync(id, ct);
        if (reserva == null) throw new InvalidOperationException("Reserva não encontrada");
        if (Enum.TryParse<ReservaStatus>(status, true, out var st))
            reserva.Status = st;
        reserva.UpdatedAt = DateTime.UtcNow;
        await _reservas.UpdateAsync(reserva, ct);
        await _reservas.SaveChangesAsync(ct);
    }

    public async Task<ReservaDto?> AtualizarStatusAsync(Guid id, Guid condominioId, Guid sindicoId, ReservaStatusUpdateDto dto, CancellationToken ct = default)
    {
        await AtualizarStatusAsync(id, dto.Status, ct);
        var r = await _reservas.GetByIdAsync(id, ct);
        if (r == null) return null;

        return new ReservaDto
        {
            Id = r.Id,
            CondominioId = condominioId,
            UnidadeId = r.UnidadeId,
            UsuarioId = sindicoId,
            AreaComumId = r.Area,
            Inicio = r.Inicio,
            Fim = r.Fim,
            Status = r.Status.ToString(),
            DataSolicitacao = r.CreatedAt
        };
    }

    public async Task<ReservaDto?> GetByIdAsync(Guid id, Guid condominioId, Guid usuarioId, CancellationToken ct = default)
    {
        var r = await _reservas.GetByIdAsync(id, ct);
        if (r == null) return null;

        return new ReservaDto
        {
            Id = r.Id,
            CondominioId = condominioId,
            UnidadeId = r.UnidadeId,
            UsuarioId = usuarioId,
            AreaComumId = r.Area,
            Inicio = r.Inicio,
            Fim = r.Fim,
            Status = r.Status.ToString(),
            DataSolicitacao = r.CreatedAt
        };
    }

    public async Task ExcluirAsync(Guid id, CancellationToken ct = default)
    {
        var reserva = await _reservas.GetByIdAsync(id, ct);
        if (reserva == null) return;

        await _reservas.DeleteAsync(reserva, ct);
        await _reservas.SaveChangesAsync(ct);
    }

    public Task<bool> CancelarAsync(Guid id, Guid condominioId, Guid usuarioId, bool sindico, CancellationToken ct = default)
    {
        return ExcluirAsync(id, ct).ContinueWith(_ => true);
    }
}
