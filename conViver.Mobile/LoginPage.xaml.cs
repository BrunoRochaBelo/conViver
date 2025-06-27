using conViver.Mobile.Services; // Added using for IFeedbackService
using System; // Added for EventArgs
using System.Diagnostics; // For Debug.WriteLine
using System.Threading.Tasks; // Added for Task
// Assuming new pages will be in the root or a 'Views' folder.
// If in 'Views', add: using conViver.Mobile.Views;

namespace conViver.Mobile;

public partial class LoginPage : ContentPage
{
    private readonly IFeedbackService _feedbackService;

    public LoginPage(IFeedbackService feedbackService) // Updated constructor
    {
        InitializeComponent();
        _feedbackService = feedbackService;
        LoginButton.Clicked += OnLoginButtonClicked; // Attach handler
    }

    private async void OnLoginButtonClicked(object sender, EventArgs e)
    {
        // Disable UI elements
        LoginButton.IsEnabled = false;
        EmailEntry.IsEnabled = false;
        PasswordEntry.IsEnabled = false;

        // Show loading using the service (which should find LoadingIndicator and FeedbackLabel)
        _feedbackService.ShowLoading("Autenticando...");
        // Also ensure direct control if needed, though service should handle it
        // LoadingIndicator.IsRunning = true;
        // LoadingIndicator.IsVisible = true;
        // FeedbackLabel.Text = "Autenticando...";
        // FeedbackLabel.IsVisible = true;
        FeedbackErrorBorder.IsVisible = false; // Hide previous errors

        // Simulate different outcomes
        // Randomly pick an outcome for simulation
        var random = new Random();
        int outcome = random.Next(1, 4); // 1: Success, 2: Invalid Credentials, 3: Connection Error

        try
        {
            await Task.Delay(2000); // Simulate API call

            switch (outcome)
            {
                case 1: // Success
                    await _feedbackService.ShowSuccessAsync("Login bem-sucedido!");
                    // Navigate to another page (e.g., AppShell.Current.GoToAsync("//MainPage"))
                    // For now, just clear fields as an example of post-success action
                    EmailEntry.Text = string.Empty;
                    PasswordEntry.Text = string.Empty;
                    if (Shell.Current != null)
                    {
                        await Shell.Current.GoToAsync("//MainPage");
                    }
                    else
                    {
                        Debug.WriteLine("Shell.Current is null, cannot navigate.");
                        await _feedbackService.ShowErrorAsync("Não foi possível navegar após o login.");
                    }
                    break;
                case 2: // Invalid credentials error
                    await _feedbackService.ShowErrorAsync("E-mail ou senha inválidos.");
                    PasswordEntry.Text = string.Empty; // Clear password
                    break;
                case 3: // Connection error
                    await _feedbackService.ShowErrorAsync("Falha na conexão. Verifique sua internet.");
                    break;
            }
        }
        catch (Exception ex)
        {
            // Generic error if something unexpected happens during simulation or UI interaction
            await _feedbackService.ShowErrorAsync($"Ocorreu um erro inesperado: {ex.Message}");
        }
        finally
        {
            // Hide loading using the service
            _feedbackService.HideLoading();
            // Also ensure direct control if needed
            // LoadingIndicator.IsRunning = false;
            // LoadingIndicator.IsVisible = false;
            // FeedbackLabel.Text = string.Empty;
            // FeedbackLabel.IsVisible = false;

            // Re-enable UI elements
            LoginButton.IsEnabled = true;
            EmailEntry.IsEnabled = true;
            PasswordEntry.IsEnabled = true;
        }
    }

    private async void OnForgotPasswordTapped(object sender, EventArgs e)
    {
        try
        {
            await Shell.Current.GoToAsync(nameof(ForgotPasswordPage));
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"Navigation to ForgotPasswordPage failed: {ex.Message}");
            await _feedbackService.ShowErrorAsync("Não foi possível abrir a página de recuperação de senha.");
        }
    }

    private async void OnRegisterTapped(object sender, EventArgs e)
    {
        try
        {
            await Shell.Current.GoToAsync(nameof(RegisterPage));
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"Navigation to RegisterPage failed: {ex.Message}");
            await _feedbackService.ShowErrorAsync("Não foi possível abrir a página de registro.");
        }
    }
}
