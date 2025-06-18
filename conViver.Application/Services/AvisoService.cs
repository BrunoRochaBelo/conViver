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
}

