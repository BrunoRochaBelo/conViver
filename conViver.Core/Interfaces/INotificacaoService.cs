using System; // Added for Guid, DateTime
using System.Threading.Tasks;
// using conViver.Core.Entities; // Not strictly needed if using primitive types/DTOs for params

namespace conViver.Core.Interfaces;

public interface INotificacaoService
{
    Task SendAsync(string destino, string mensagem, CancellationToken cancellationToken = default);
    Task SendToUserAsync(Guid userId, string message, CancellationToken cancellationToken = default); // Novo método

    // Visitor Notifications
    Task NotificarChegadaVisitanteAsync(Guid unidadeId, string nomeVisitante, string? motivoVisita);
    Task NotificarVisitantePreAutorizadoAsync(Guid unidadeId, string nomeVisitante, string? qrCodeValue, DateTime? validadeQRCode);
    Task NotificarFalhaQRCodeAsync(Guid? unidadeId, string qrCodeValue, string motivoFalha);
    Task NotificarSaidaVisitanteAsync(Guid unidadeId, string nomeVisitante);
}
