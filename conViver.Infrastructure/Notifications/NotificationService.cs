using System;
using System.Threading.Tasks;
using conViver.Core.Entities;
using conViver.Core.Enums;
using conViver.Core.Interfaces;
// Potentially add: using Microsoft.Extensions.Logging; if you want to use ILogger

namespace conViver.Infrastructure.Notifications
{
    public class NotificationService : INotificacaoService
    {
        // Example: Optional ILogger for more structured logging
        // private readonly ILogger<NotificationService> _logger;
        // public NotificationService(ILogger<NotificationService> logger)
        // {
        //     _logger = logger;
        // }
        // For simplicity, this subtask will use Console.WriteLine directly.

        public Task EnviarNotificacaoReservaCriadaAsync(Reserva reserva)
        {
            string mensagem = $"[NOTIFICACAO] Reserva CRIADA: ID {reserva.Id} para Espaço {reserva.EspacoComumId} por Usuário {reserva.UsuarioId} das {reserva.Inicio} às {reserva.Fim}. Status: {reserva.Status}.";
            Console.WriteLine(mensagem);
            // _logger?.LogInformation(mensagem);
            return Task.CompletedTask;
        }

        public Task EnviarNotificacaoReservaStatusAlteradoAsync(Reserva reserva, ReservaStatus statusAnterior)
        {
            string mensagem = $"[NOTIFICACAO] Reserva STATUS ALTERADO: ID {reserva.Id}. Status anterior: {statusAnterior}, Novo Status: {reserva.Status}. Justificativa: {reserva.JustificativaStatus ?? "N/A"}.";
            Console.WriteLine(mensagem);
            return Task.CompletedTask;
        }

        public Task EnviarNotificacaoReservaAlteradaAsync(Reserva reserva, string detalhesAlteracao)
        {
            string mensagem = $"[NOTIFICACAO] Reserva ALTERADA: ID {reserva.Id}. Detalhes: {detalhesAlteracao}. Novo período: {reserva.Inicio} às {reserva.Fim}.";
            Console.WriteLine(mensagem);
            return Task.CompletedTask;
        }

        public Task EnviarNotificacaoReservaCanceladaAsync(Reserva reserva)
        {
            string mensagem = $"[NOTIFICACAO] Reserva CANCELADA: ID {reserva.Id}. Espaço {reserva.EspacoComumId}. Período: {reserva.Inicio} às {reserva.Fim}. Cancelado por: {reserva.CanceladoPorId}. Motivo: {reserva.JustificativaStatus ?? "N/A"}.";
            Console.WriteLine(mensagem);
            return Task.CompletedTask;
        }

        public Task EnviarLembreteReservaAsync(Reserva reserva)
        {
            // This would typically be triggered by a scheduled job.
            string mensagem = $"[LEMBRETE] Reserva Próxima: ID {reserva.Id} para Espaço {reserva.EspacoComumId} amanhã/hoje das {reserva.Inicio} às {reserva.Fim}.";
            Console.WriteLine(mensagem);
            return Task.CompletedTask;
        }

        public Task EnviarNotificacaoAdminReservaPendenteAsync(Reserva reserva)
        {
            string mensagem = $"[ADMIN NOTIFICACAO] Reserva PENDENTE: ID {reserva.Id} para Espaço {reserva.EspacoComumId} por Usuário {reserva.UsuarioId} aguardando aprovação.";
            Console.WriteLine(mensagem);
            return Task.CompletedTask;
        }

        public Task EnviarNotificacaoAdminConflitoReservaAsync(Reserva reservaConflitante, Reserva novaTentativa)
        {
            // This is a more complex scenario.
            string mensagem = $"[ADMIN NOTIFICACAO] CONFLITO DE RESERVA: Nova tentativa ({novaTentativa.Inicio}-{novaTentativa.Fim} por Usuário {novaTentativa.UsuarioId}) para Espaço {novaTentativa.EspacoComumId} conflita com Reserva existente ID {reservaConflitante.Id}.";
            Console.WriteLine(mensagem);
            return Task.CompletedTask;
        }
    }
}
