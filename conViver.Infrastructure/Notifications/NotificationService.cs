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
        // TODO: Implementar a lógica real de envio de notificação (e.g., Firebase, SendGrid, etc.)
        // Por enquanto, apenas loga a tentativa.
        _logger.LogInformation("Sending notification to {destino}: {msg}", destino, mensagem);
        return Task.CompletedTask;
    }

    public Task SendToUserAsync(Guid usuarioId, string mensagem, CancellationToken cancellationToken = default)
    {
        string destino = $"user:{usuarioId}";
        return SendAsync(destino, mensagem, cancellationToken);
    }

    public Task NotificarChegadaVisitanteAsync(Guid unidadeId, string nomeVisitante, string? motivoVisita)
    {
        string mensagem = $"[NOTIFICACAO] Unidade {unidadeId}: Visitante '{nomeVisitante}' chegou.";
        if (!string.IsNullOrEmpty(motivoVisita)) {
            mensagem += $" Motivo: {motivoVisita}.";
        }
        _logger.LogInformation(mensagem);
        return Task.CompletedTask;
    }

    public Task NotificarVisitantePreAutorizadoAsync(Guid unidadeId, string nomeVisitante, string? qrCodeValue, DateTime? validadeQRCode)
    {
        string mensagem = $"[NOTIFICACAO] Unidade {unidadeId}: Visitante '{nomeVisitante}' foi pré-autorizado.";
        if (!string.IsNullOrEmpty(qrCodeValue)) {
            mensagem += $" QR Code: {qrCodeValue}.";
        }
        if (validadeQRCode.HasValue) {
            mensagem += $" Válido até: {validadeQRCode.Value.ToString("g")}."; // "g" for general short date/time
        }
        _logger.LogInformation(mensagem);
        return Task.CompletedTask;
    }

    public Task NotificarFalhaQRCodeAsync(Guid? unidadeId, string qrCodeValue, string motivoFalha)
    {
        string mensagem = $"[NOTIFICACAO] Falha na validação do QR Code '{qrCodeValue}'. Motivo: {motivoFalha}.";
        if (unidadeId.HasValue) {
            mensagem += $" Associado à tentativa de visita à unidade {unidadeId.Value}.";
        }
        _logger.LogWarning(mensagem); // Use Warning for failures
        return Task.CompletedTask;
    }

    public Task NotificarSaidaVisitanteAsync(Guid unidadeId, string nomeVisitante)
    {
        string mensagem = $"[NOTIFICACAO] Unidade {unidadeId}: Visitante '{nomeVisitante}' registrou saída.";
        _logger.LogInformation(mensagem);
        return Task.CompletedTask;
    }

    }
}
