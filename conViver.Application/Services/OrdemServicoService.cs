using conViver.Core.Entities;
using conViver.Core.Interfaces;
using conViver.Core.Enums;
using Microsoft.EntityFrameworkCore;

namespace conViver.Application;

public class OrdemServicoService
{
    private readonly IRepository<OrdemServico> _ordens;

    public OrdemServicoService(IRepository<OrdemServico> ordens)
    {
        _ordens = ordens;
    }

    public Task<List<OrdemServico>> GetAllAsync(CancellationToken ct = default)
        => _ordens.Query().ToListAsync(ct);

    public Task<OrdemServico?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => _ordens.GetByIdAsync(id, ct);

    public async Task<OrdemServico> CriarAsync(Guid unidadeId, string? descricao, CancellationToken ct = default)
    {
        var os = new OrdemServico
        {
            Id = Guid.NewGuid(),
            UnidadeId = unidadeId,
            Descricao = descricao,
            CriadoEm = DateTime.UtcNow
        };

        await _ordens.AddAsync(os, ct);
        await _ordens.SaveChangesAsync(ct);
        return os;
    }

    public async Task AtualizarStatusAsync(Guid id, string status, CancellationToken ct = default)
    {
        var os = await _ordens.GetByIdAsync(id, ct) ?? throw new InvalidOperationException("OS nao encontrada");
        if (Enum.TryParse<OrdemServicoStatus>(status, true, out var st))
            os.Status = st;
        os.UpdatedAt = DateTime.UtcNow;
        if (os.Status == OrdemServicoStatus.Concluida)
            os.ConcluidoEm = DateTime.UtcNow;
        await _ordens.UpdateAsync(os, ct);
        await _ordens.SaveChangesAsync(ct);
    }
}

