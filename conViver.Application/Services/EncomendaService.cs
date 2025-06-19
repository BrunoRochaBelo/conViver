using conViver.Core.Entities;
using conViver.Core.Enums;
using conViver.Core.Interfaces;
using conViver.Core.DTOs;
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

    public async Task<Encomenda> RegistrarRecebimentoAsync(EncomendaInputDto input, Guid usuarioId, CancellationToken ct = default)
    {
        var encomenda = new Encomenda
        {
            Id = Guid.NewGuid(),
            UnidadeId = input.UnidadeId,
            Descricao = input.Descricao,
            CodigoRastreio = input.CodigoRastreio,
            Remetente = input.Remetente,
            Observacoes = input.Observacoes,
            RecebidoPor = usuarioId,
            RecebidoEm = DateTime.UtcNow,
            Status = EncomendaStatus.AguardandoRetirada,
            DataStatus = DateTime.UtcNow
        };

        await _encomendas.AddAsync(encomenda, ct);
        await _encomendas.SaveChangesAsync(ct);

        return encomenda;
    }

    public async Task<Encomenda?> RegistrarRetiradaAsync(Guid encomendaId, Guid usuarioId, CancellationToken ct = default)
    {
        var encomenda = await _encomendas.GetByIdAsync(encomendaId, ct);
        if (encomenda == null)
            return null;

        if (encomenda.RetiradoEm != null)
            return encomenda;

        encomenda.RetiradoEm = DateTime.UtcNow;
        encomenda.RetiradoPor = usuarioId;
        encomenda.Status = EncomendaStatus.Retirada;
        encomenda.DataStatus = DateTime.UtcNow;

        await _encomendas.UpdateAsync(encomenda, ct);
        await _encomendas.SaveChangesAsync(ct);

        return encomenda;
    }

    public Task<Encomenda?> ObterPorIdAsync(Guid id, CancellationToken ct = default)
    {
        return _encomendas.GetByIdAsync(id, ct);
    }
}
