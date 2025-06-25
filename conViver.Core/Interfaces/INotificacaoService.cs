using System;
using System.Threading;
using System.Threading.Tasks;

namespace conViver.Core.Interfaces;

public interface INotificacaoService
{
    Task SendAsync(string destino, string mensagem, CancellationToken cancellationToken = default);

    /// <summary>
    /// Envia uma notificação diretamente para um usuário específico.
    /// </summary>
    /// <param name="usuarioId">Identificador do usuário destino.</param>
    /// <param name="mensagem">Conteúdo da mensagem.</param>
    /// <param name="cancellationToken">Token de cancelamento.</param>
    Task SendToUserAsync(Guid usuarioId, string mensagem, CancellationToken cancellationToken = default);

    // Visitor Notifications
    Task NotificarChegadaVisitanteAsync(Guid unidadeId, string nomeVisitante, string? motivoVisita);
    Task NotificarVisitantePreAutorizadoAsync(Guid unidadeId, string nomeVisitante, string? qrCodeValue, DateTime? validadeQRCode);
    Task NotificarFalhaQRCodeAsync(Guid? unidadeId, string qrCodeValue, string motivoFalha);
    Task NotificarSaidaVisitanteAsync(Guid unidadeId, string nomeVisitante);
}
