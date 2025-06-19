using System.Threading.Tasks;
using conViver.Core.Entities; // For Reserva entity
using conViver.Core.Enums;   // For ReservaStatus

namespace conViver.Core.Interfaces
{
    public interface INotificacaoService
    {
        Task EnviarNotificacaoReservaCriadaAsync(Reserva reserva);
        Task EnviarNotificacaoReservaStatusAlteradoAsync(Reserva reserva, ReservaStatus statusAnterior);
        Task EnviarNotificacaoReservaAlteradaAsync(Reserva reserva, string detalhesAlteracao);
        Task EnviarNotificacaoReservaCanceladaAsync(Reserva reserva);
        Task EnviarLembreteReservaAsync(Reserva reserva); // e.g., 24h before

        // For admin notifications
        Task EnviarNotificacaoAdminReservaPendenteAsync(Reserva reserva);
        // Consider if this specific admin conflict notification is still needed,
        // or if general failure notifications cover it. Keeping for now as per plan.
        Task EnviarNotificacaoAdminConflitoReservaAsync(Reserva reservaConflitante, Reserva novaTentativa);
    }
}
