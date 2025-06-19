using conViver.Core.DTOs;
using conViver.Core.Entities;
using conViver.Core.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace conViver.Application;

public class CondominioService
{
    private readonly IRepository<Condominio> _condos;

    public CondominioService(IRepository<Condominio> condos)
    {
        _condos = condos;
    }

    public async Task<IEnumerable<CondominioDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _condos.Query()
            .Select(c => new CondominioDto { Id = c.Id, Nome = c.Nome })
            .ToListAsync(cancellationToken);
    }

    public Task<IEnumerable<CondominioDto>> ListarTodosAsync(CancellationToken cancellationToken = default)
        => GetAllAsync(cancellationToken);

    public Task<Condominio?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return _condos.GetByIdAsync(id, cancellationToken);
    }

    public async Task<CondominioDto?> ObterPorIdDetalhadoAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var cond = await _condos.GetByIdAsync(id, cancellationToken);
        return cond == null ? null : new CondominioDto { Id = cond.Id, Nome = cond.Nome };
    }

    public async Task<CondominioDto> CreateAsync(CreateCondominioRequest request, CancellationToken cancellationToken = default)
    {
        var cond = new Condominio
        {
            Id = Guid.NewGuid(),
            Nome = request.Nome,
            Endereco = new(),
        };

        await _condos.AddAsync(cond, cancellationToken);
        await _condos.SaveChangesAsync(cancellationToken);

        return new CondominioDto { Id = cond.Id, Nome = cond.Nome };
    }

    public Task<CondominioDto> CriarCondominioAsync(CondominioInputDto input, CancellationToken cancellationToken = default)
    {
        var req = new CreateCondominioRequest { Nome = input.Nome };
        return CreateAsync(req, cancellationToken);
    }

    public async Task<CondominioDto?> AtualizarCondominioAsync(Guid id, CondominioInputDto input, CancellationToken cancellationToken = default)
    {
        var cond = await _condos.GetByIdAsync(id, cancellationToken);
        if (cond == null) return null;
        cond.Nome = input.Nome;
        await _condos.UpdateAsync(cond, cancellationToken);
        await _condos.SaveChangesAsync(cancellationToken);
        return new CondominioDto { Id = cond.Id, Nome = cond.Nome };
    }

    public async Task<bool> DeletarCondominioAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var cond = await _condos.GetByIdAsync(id, cancellationToken);
        if (cond == null) return false;
        await _condos.DeleteAsync(cond, cancellationToken);
        await _condos.SaveChangesAsync(cancellationToken);
        return true;
    }
}

