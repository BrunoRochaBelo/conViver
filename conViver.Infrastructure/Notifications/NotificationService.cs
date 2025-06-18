using conViver.Core.Interfaces;
using Microsoft.Extensions.Logging;

namespace conViver.Infrastructure.Notifications;

public class NotificationService : INotificacaoService
{
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(ILogger<NotificationService> logger)
    {
        _logger = logger;
    }

    public Task SendAsync(string destino, string mensagem, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Sending notification to {destino}: {msg}", destino, mensagem);
        return Task.CompletedTask;
    }
}
