using conViver.Core.Entities;
using conViver.Core.Interfaces;
using conViver.Core.DTOs;
using Microsoft.EntityFrameworkCore;

namespace conViver.Application.Services;

public class OcorrenciaService
{
    private readonly IRepository<OcorrenciaSeguranca> _repo;

    public OcorrenciaService(IRepository<OcorrenciaSeguranca> repo)
    {
        _repo = repo;
    }

    public async Task<OcorrenciaSeguranca> CriarAsync(Guid condominioId, Guid usuarioId, OcorrenciaInputDto dto, CancellationToken ct = default)
    {
        var ent = new OcorrenciaSeguranca
        {
            Id = Guid.NewGuid(),
            CondominioId = condominioId,
            UnidadeId = dto.UnidadeId,
            UsuarioId = usuarioId,
            Categoria = dto.Categoria,
            Descricao = dto.Descricao,
            Local = dto.Local,
            Fotos = dto.Fotos,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await _repo.AddAsync(ent, ct);
        await _repo.SaveChangesAsync(ct);
        return ent;
    }

    public async Task<IEnumerable<OcorrenciaDto>> ListarPorCondominioAsync(Guid condominioId, CancellationToken ct = default)
    {
        return await _repo.Query()
            .Where(o => o.CondominioId == condominioId)
            .OrderByDescending(o => o.DataRegistro)
            .Select(o => new OcorrenciaDto
            {
                Id = o.Id,
                Categoria = o.Categoria,
                Descricao = o.Descricao,
                Local = o.Local,
                UnidadeId = o.UnidadeId,
                Status = o.Status,
                DataRegistro = o.DataRegistro,
                DataEncerramento = o.DataEncerramento,
                Fotos = o.Fotos
            })
            .ToListAsync(ct);
    }

    public async Task<bool> AtualizarStatusAsync(Guid id, string status, CancellationToken ct = default)
    {
        var ent = await _repo.GetByIdAsync(id, ct);
        if (ent == null) return false;
        ent.Status = status;
        if (status == "Encerrada" && ent.DataEncerramento == null)
            ent.DataEncerramento = DateTime.UtcNow;
        ent.UpdatedAt = DateTime.UtcNow;
        await _repo.UpdateAsync(ent, ct);
        await _repo.SaveChangesAsync(ct);
        return true;
    }
}
