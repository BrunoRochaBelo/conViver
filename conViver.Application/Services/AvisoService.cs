using conViver.Core.Entities;
using conViver.Core.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace conViver.Application;

public class AvisoService
{
    private readonly IRepository<Aviso> _avisos;
    private readonly INotificacaoService _notify;

    public AvisoService(IRepository<Aviso> avisos, INotificacaoService notify)
    {
        _avisos = avisos;
        _notify = notify;
    }

    public Task<List<Aviso>> ListarAsync(Guid condominioId, CancellationToken ct = default)
    {
        return _avisos.Query()
            .Where(a => a.CondominioId == condominioId)
            .OrderByDescending(a => a.PublicadoEm)
            .ToListAsync(ct);
    }

    public async Task<Aviso> PublicarAsync(Guid condominioId, string categoria, string titulo, string? corpo, Guid usuarioId, CancellationToken ct = default)
    {
        var aviso = new Aviso
        {
            Id = Guid.NewGuid(),
            CondominioId = condominioId,
            Categoria = categoria,
            Titulo = titulo,
            Corpo = corpo,
            PublicadoEm = DateTime.UtcNow,
            PublicadoPor = usuarioId
        };

        await _avisos.AddAsync(aviso, ct);
        await _avisos.SaveChangesAsync(ct);
        await _notify.SendAsync($"condo:{condominioId}", $"Novo aviso: {titulo}", ct);
        return aviso;
    }

    public async Task<Aviso?> EditarAsync(Guid avisoId, Guid condominioId, string categoria, string titulo, string? corpo, Guid usuarioIdEditando, CancellationToken ct = default)
    {
        var aviso = await _avisos.Query()
            .FirstOrDefaultAsync(a => a.Id == avisoId && a.CondominioId == condominioId, ct);

        if (aviso == null)
        {
            return null;
        }

        // Opcional: Verificar se usuarioIdEditando tem permissão (ex: é o mesmo que PublicadoPor ou é um administrador/síndico).
        // Para esta etapa, podemos assumir que a verificação de role no controller é suficiente.

        aviso.Categoria = categoria;
        aviso.Titulo = titulo;
        aviso.Corpo = corpo;
        aviso.UpdatedAt = DateTime.UtcNow; // Supondo que a entidade Aviso tenha um campo UpdatedAt

        await _avisos.UpdateAsync(aviso, ct);
        await _avisos.SaveChangesAsync(ct);

        return aviso;
    }

    public async Task<bool> ArquivarAsync(Guid avisoId, Guid condominioId, Guid usuarioIdArquivando, CancellationToken ct = default)
    {
        var aviso = await _avisos.Query()
            .FirstOrDefaultAsync(a => a.Id == avisoId && a.CondominioId == condominioId, ct);

        if (aviso == null)
        {
            return false;
        }

        // Opcional: Verificar permissão do usuarioIdArquivando.

        // Realizar hard delete
        await _avisos.DeleteAsync(aviso, ct);
        await _avisos.SaveChangesAsync(ct);

        return true;
    }
}

