using conViver.Core.Entities;
using conViver.Core.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace conViver.Application;

public class VotacaoService
{
    private readonly IRepository<Votacao> _votacoes;

    public VotacaoService(IRepository<Votacao> votacoes)
    {
        _votacoes = votacoes;
    }

    public Task<List<Votacao>> ListarAsync(Guid condominioId, CancellationToken ct = default)
        => _votacoes.Query().Where(v => v.CondominioId == condominioId).ToListAsync(ct);

    public async Task<Votacao> CriarAsync(Guid condominioId, string assunto, CancellationToken ct = default)
    {
        var vot = new Votacao
        {
            Id = Guid.NewGuid(),
            CondominioId = condominioId,
            Titulo = assunto, // Changed from Assunto to Titulo
            DataInicio = DateTime.UtcNow // Changed from CriadoEm to DataInicio
            // Descricao, DataFim, and Ativa will use default values or be set elsewhere
        };

        await _votacoes.AddAsync(vot, ct);
        await _votacoes.SaveChangesAsync(ct);
        return vot;
    }
}

