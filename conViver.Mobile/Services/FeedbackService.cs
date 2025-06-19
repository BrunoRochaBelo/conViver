// conViver.Mobile/Services/FeedbackService.cs
using Microsoft.Maui.Controls;
using System;
using System.Diagnostics;
using System.Threading.Tasks;
using CommunityToolkit.Maui.Alerts;
using CommunityToolkit.Maui.Core; // For SnackbarOptions

namespace conViver.Mobile.Services
{
    public class FeedbackService : IFeedbackService
    {
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

        public async Task ShowSuccessAsync(string message, string title = "Sucesso")
        {
            // Title is not directly used by Snackbar, message is key.
            var snackbar = Snackbar.Make(message, null, string.Empty, TimeSpan.FromSeconds(3), new SnackbarOptions
            {
                BackgroundColor = Colors.Green,
                TextColor = Colors.White
            });
            await snackbar.Show();
            // return Task.CompletedTask; // Implicitly returned by async Task method without return
        }

        public async Task ShowInfoAsync(string message, string title = "Informação")
        {
            var snackbar = Snackbar.Make(message, null, string.Empty, TimeSpan.FromSeconds(3), new SnackbarOptions
            {
                BackgroundColor = Colors.Blue, // Example color for Info
                TextColor = Colors.White
            });
            await snackbar.Show();
            // return Task.CompletedTask;
        }

        public void ShowLoading(string message = "Carregando...")
        {
            if (Application.Current?.MainPage is AppShell shell)
            {
                var loadingIndicatorGrid = shell.FindByName<Grid>("GlobalLoadingIndicator");
                var messageLabel = shell.FindByName<Label>("LoadingMessage");
                // var spinner = shell.FindByName<ActivityIndicator>("LoadingSpinner"); // Already set to IsRunning=True in XAML

                if (loadingIndicatorGrid != null)
                {
                    if (messageLabel != null)
                    {
                        messageLabel.Text = message;
                    }
                    loadingIndicatorGrid.IsVisible = true;
                    // if (spinner != null) spinner.IsRunning = true; // Ensure spinner is running
                }
            }
            Debug.WriteLine($"FeedbackService: ShowLoading - {message}");
        }

        public void HideLoading()
        {
            if (Application.Current?.MainPage is AppShell shell)
            {
                var loadingIndicatorGrid = shell.FindByName<Grid>("GlobalLoadingIndicator");
                // var spinner = shell.FindByName<ActivityIndicator>("LoadingSpinner");

                if (loadingIndicatorGrid != null)
                {
                    loadingIndicatorGrid.IsVisible = false;
                    // if (spinner != null) spinner.IsRunning = false; // Stop spinner
                }
            }
            Debug.WriteLine($"FeedbackService: HideLoading");
        }
    }
}
