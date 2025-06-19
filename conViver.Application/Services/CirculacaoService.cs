using conViver.Core.Entities;
using conViver.Core.Interfaces;
using conViver.Core.DTOs;
using Microsoft.EntityFrameworkCore;

namespace conViver.Application.Services;

public class CirculacaoService
{
    private readonly IRepository<CirculacaoSolicitacao> _repo;

    public CirculacaoService(IRepository<CirculacaoSolicitacao> repo)
    {
        _repo = repo;
    }

    public async Task<CirculacaoSolicitacao> CriarAsync(Guid condominioId, Guid usuarioId, CirculacaoInputDto dto, CancellationToken ct = default)
    {
        var ent = new CirculacaoSolicitacao
        {
            Id = Guid.NewGuid(),
            CondominioId = condominioId,
            UnidadeId = dto.UnidadeId,
            PrestadorServicoId = dto.PrestadorServicoId,
            NomePrestador = dto.NomePrestador,
            TipoServico = dto.TipoServico,
            DataEntradaPrevista = dto.DataEntradaPrevista,
            DataSaidaPrevista = dto.DataSaidaPrevista,
            ImpactoColetivo = dto.ImpactoColetivo,
            Observacoes = dto.Observacoes,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await _repo.AddAsync(ent, ct);
        await _repo.SaveChangesAsync(ct);
        return ent;
    }

    public async Task<IEnumerable<CirculacaoDto>> ListarPorCondominioAsync(Guid condominioId, CancellationToken ct = default)
    {
        return await _repo.Query()
            .Where(c => c.CondominioId == condominioId)
            .OrderByDescending(c => c.DataEntradaPrevista)
            .Select(c => new CirculacaoDto
            {
                Id = c.Id,
                UnidadeId = c.UnidadeId,
                PrestadorServicoId = c.PrestadorServicoId,
                NomePrestador = c.NomePrestador,
                TipoServico = c.TipoServico,
                DataEntradaPrevista = c.DataEntradaPrevista,
                DataSaidaPrevista = c.DataSaidaPrevista,
                ImpactoColetivo = c.ImpactoColetivo,
                Aprovado = c.Aprovado,
                Cancelado = c.Cancelado,
                ChegadaConfirmada = c.ChegadaConfirmada,
                Observacoes = c.Observacoes
            })
            .ToListAsync(ct);
    }

    public async Task<bool> AtualizarStatusAsync(Guid id, bool? aprovado = null, bool? chegada = null, CancellationToken ct = default)
    {
        var ent = await _repo.GetByIdAsync(id, ct);
        if (ent == null) return false;
        if (aprovado.HasValue) ent.Aprovado = aprovado.Value;
        if (chegada.HasValue) ent.ChegadaConfirmada = chegada.Value;
        ent.UpdatedAt = DateTime.UtcNow;
        await _repo.UpdateAsync(ent, ct);
        await _repo.SaveChangesAsync(ct);
        return true;
    }
}
