using System.Threading;
using System.Threading.Tasks;

namespace conViver.Core.Notifications;

public interface INotificationSender
{
    Task SendAsync(NotificationMessage message, CancellationToken ct = default);
}
