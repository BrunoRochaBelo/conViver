// conViver.Mobile/Services/FeedbackService.cs
using Microsoft.Maui.Controls;
using System;
using System.Diagnostics;
using System.Threading.Tasks;

namespace conViver.Mobile.Services
{
    public class FeedbackService : IFeedbackService
    {
        // For non-modal feedback like toasts/snackbars,
        // the CommunityToolkit.Maui.Alerts package is recommended for future enhancement.
        // e.g., using CancellationTokenSource cts = new CancellationTokenSource();
        //        var snackbar = CommunityToolkit.Maui.Alerts.Snackbar.Make("Mensagem...", () => Debug.WriteLine("Ação Snackbar"), "Ação", TimeSpan.FromSeconds(5));
        //        await snackbar.Show(cts.Token);

        public Task ShowAlertAsync(string title, string message, string cancel = "OK")
        {
            if (Application.Current?.MainPage == null)
                return Task.CompletedTask;
            return Application.Current.MainPage.DisplayAlert(title, message, cancel);
        }

        public Task<bool> ShowConfirmationAsync(string title, string message, string accept = "Sim", string cancel = "Não")
        {
            if (Application.Current?.MainPage == null)
                return Task.FromResult(false);
            return Application.Current.MainPage.DisplayAlert(title, message, accept, cancel);
        }

        public Task ShowErrorAsync(string message, string title = "Erro")
        {
            return ShowAlertAsync(title, message, "OK");
        }

        public Task ShowSuccessAsync(string message, string title = "Sucesso")
        {
            return ShowAlertAsync(title, message, "OK");
        }

        public Task ShowInfoAsync(string message, string title = "Informação")
        {
            return ShowAlertAsync(title, message, "OK");
        }

        public void ShowLoading(string message = "Carregando...")
        {
            if (Application.Current?.MainPage == null) return;

            // Try to find common loading indicators by convention on the current page
            // This is a basic approach. A more robust solution would be a dedicated global loading UI.
            var currentPage = GetCurrentPage(Application.Current.MainPage);
            if (currentPage == null) return;

            var activityIndicator = currentPage.FindByName<ActivityIndicator>("LoadingIndicator");
            var messageLabel = currentPage.FindByName<Label>("FeedbackLabel"); // Or a specific LoadingMessageLabel

            if (activityIndicator != null)
            {
                activityIndicator.IsRunning = true;
                activityIndicator.IsVisible = true;
            }

            if (messageLabel != null)
            {
                messageLabel.Text = message;
                messageLabel.IsVisible = true;
            }
            Debug.WriteLine($"FeedbackService: ShowLoading - {message}");
        }

        public void HideLoading()
        {
            if (Application.Current?.MainPage == null) return;

            var currentPage = GetCurrentPage(Application.Current.MainPage);
            if (currentPage == null) return;

            var activityIndicator = currentPage.FindByName<ActivityIndicator>("LoadingIndicator");
            var messageLabel = currentPage.FindByName<Label>("FeedbackLabel"); // Or a specific LoadingMessageLabel

            if (activityIndicator != null)
            {
                activityIndicator.IsRunning = false;
                activityIndicator.IsVisible = false;
            }

            if (messageLabel != null)
            {
                messageLabel.Text = string.Empty;
                messageLabel.IsVisible = false;
            }
             Debug.WriteLine($"FeedbackService: HideLoading");
        }

        // Helper to get the current visible page, especially if using Shell navigation
        private Page GetCurrentPage(Page mainPage)
        {
            if (mainPage is Shell shell)
            {
                if (shell.CurrentPage != null)
                    return shell.CurrentPage;
            }
            else if (mainPage is NavigationPage navPage)
            {
                 if (navPage.CurrentPage != null)
                    return navPage.CurrentPage;
            }
            return mainPage; // Fallback or for simpler navigation structures
        }
    }
}
