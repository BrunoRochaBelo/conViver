using System.Threading;
using System.Threading.Tasks;

namespace conViver.Core.Notifications;

public interface INotificationQueue
{
    Task QueueAsync(NotificationMessage message, CancellationToken ct = default);
}
