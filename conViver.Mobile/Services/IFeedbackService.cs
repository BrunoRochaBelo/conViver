// conViver.Mobile/Services/IFeedbackService.cs
using System.Threading.Tasks;

namespace conViver.Mobile.Services
{
    public interface IFeedbackService
    {
        Task ShowAlertAsync(string title, string message, string cancel = "OK");
        Task<bool> ShowConfirmationAsync(string title, string message, string accept = "Sim", string cancel = "Não");
        Task ShowErrorAsync(string message, string title = "Erro");
        Task ShowSuccessAsync(string message, string title = "Sucesso");
        Task ShowInfoAsync(string message, string title = "Informação");

        /// <summary>
        /// Shows a loading indicator.
        /// Note: This basic version might try to find specific UI elements on the current page.
        /// A more robust solution would involve a global loading overlay managed by this service.
        /// </summary>
        /// <param name="message">The message to display with the loading indicator.</param>
        void ShowLoading(string message = "Carregando...");

        /// <summary>
        /// Hides the loading indicator.
        /// </summary>
        void HideLoading();
    }
}
