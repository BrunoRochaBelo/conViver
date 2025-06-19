using System.Threading;
using System.Threading.Channels;
using System.Threading.Tasks;
using conViver.Core.Notifications;
using Microsoft.Extensions.Hosting;

namespace conViver.Infrastructure.Notifications;

public class NotificationQueue : BackgroundService, INotificationQueue
{
    private readonly Channel<NotificationMessage> _channel = Channel.CreateUnbounded<NotificationMessage>();
    private readonly INotificationSender _sender;

    public NotificationQueue(INotificationSender sender)
    {
        _sender = sender;
    }

    public Task QueueAsync(NotificationMessage message, CancellationToken ct = default)
    {
        return _channel.Writer.WriteAsync(message, ct).AsTask();
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var msg in _channel.Reader.ReadAllAsync(stoppingToken))
        {
            await _sender.SendAsync(msg, stoppingToken);
        }
    }
}
