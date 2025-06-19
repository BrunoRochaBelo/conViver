using conViver.Core.Entities;
using conViver.Core.Interfaces;
using conViver.Core.Notifications;
using Microsoft.EntityFrameworkCore;

namespace conViver.Application;

public class AvisoService
{
    private readonly IRepository<Aviso> _avisos;
    private readonly IRepository<AvisoLeitura> _leituras;
    private readonly IAuditService _audit;
    private readonly INotificationQueue _queue;

    public AvisoService(IRepository<Aviso> avisos, IRepository<AvisoLeitura> leituras, INotificationQueue queue, IAuditService audit)
    {
        _avisos = avisos;
        _leituras = leituras;
        _queue = queue;
        _audit = audit;
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
        await _queue.QueueAsync(new NotificationMessage("aviso", null, "Novo aviso", titulo), ct);
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

    public async Task RegistrarLeituraAsync(Guid avisoId, Guid usuarioId, string? ip, string? deviceId, CancellationToken ct = default)
    {
        var registro = new AvisoLeitura
        {
            Id = Guid.NewGuid(),
            AvisoId = avisoId,
            UsuarioId = usuarioId,
            Ip = ip,
            DeviceId = deviceId,
            LidoEm = DateTime.UtcNow
        };
        await _leituras.AddAsync(registro, ct);
        await _leituras.SaveChangesAsync(ct);

        await _audit.RegistrarAsync(new LogAuditoria
        {
            Id = Guid.NewGuid(),
            UsuarioId = usuarioId,
            Acao = "leitura_aviso",
            Entidade = nameof(Aviso),
            EntityId = avisoId,
            CriadoEm = DateTime.UtcNow
        }, ct);
    }
}

