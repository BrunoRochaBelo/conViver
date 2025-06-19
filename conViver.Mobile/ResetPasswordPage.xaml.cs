using conViver.Mobile.Services;
using System;
using System.Diagnostics;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace conViver.Mobile;

[QueryProperty(nameof(Token), "token")]
public partial class ResetPasswordPage : ContentPage
{
    private readonly IFeedbackService _feedbackService;
    // private static readonly HttpClient client = new HttpClient(); // Uncomment for actual API calls

    private string _token;
    public string Token
    {
        get => _token;
        set
        {
            _token = value;
            // You could add logic here if the token needs validation upon setting,
            // though typically it's used when the form is submitted.
            Debug.WriteLine($"Token received: {_token}");
        }
    }

    public ResetPasswordPage(IFeedbackService feedbackService)
    {
        InitializeComponent();
        _feedbackService = feedbackService;
        SubmitButton.Clicked += OnSubmitButtonClicked;

        // Set API base URL for actual calls - replace with your config
        // if (client.BaseAddress == null)
        // {
        //     client.BaseAddress = new Uri("YOUR_API_BASE_URL"); // e.g., http://localhost:5000
        // }
    }

    private async void OnSubmitButtonClicked(object sender, EventArgs e)
    {
        if (string.IsNullOrWhiteSpace(NewPasswordEntry.Text) || string.IsNullOrWhiteSpace(ConfirmPasswordEntry.Text))
        {
            await _feedbackService.ShowErrorAsync("Por favor, preencha ambos os campos de senha.");
            return;
        }

        if (NewPasswordEntry.Text != ConfirmPasswordEntry.Text)
        {
            await _feedbackService.ShowErrorAsync("As senhas não coincidem.");
            return;
        }

        if (NewPasswordEntry.Text.Length < 6) // Basic validation
        {
            await _feedbackService.ShowErrorAsync("A senha deve ter pelo menos 6 caracteres.");
            return;
        }

        if (string.IsNullOrWhiteSpace(Token))
        {
            await _feedbackService.ShowErrorAsync("Token de redefinição inválido ou ausente. Por favor, tente o link de recuperação novamente.");
            return;
        }

        SubmitButton.IsEnabled = false;
        _feedbackService.ShowLoading("Redefinindo senha...");

        try
        {
            // Simulate API Call
            Debug.WriteLine($"Simulating API call to /api/v1/auth/reset-password with Token: {Token} and NewPassword: {NewPasswordEntry.Text}");
            await Task.Delay(1500);

            // ** Actual API Call Example (Uncomment and adjust) **
            /*
            var payload = new { ResetToken = Token, NovaSenha = NewPasswordEntry.Text };
            var jsonPayload = JsonSerializer.Serialize(payload);
            var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

            HttpResponseMessage response = await client.PostAsync("/api/v1/auth/reset-password", content);

            if (response.IsSuccessStatusCode)
            {
                await _feedbackService.ShowSuccessAsync("Senha redefinida com sucesso! Você já pode fazer login com sua nova senha.");
                await Shell.Current.GoToAsync($"//{nameof(LoginPage)}"); // Navigate to Login page
            }
            else
            {
                string errorContent = await response.Content.ReadAsStringAsync();
                string errorMessage = "Não foi possível redefinir a senha. O token pode ser inválido ou ter expirado.";
                 if (!string.IsNullOrWhiteSpace(errorContent)) {
                    try {
                        var errorDoc = JsonDocument.Parse(errorContent);
                        if (errorDoc.RootElement.TryGetProperty("message", out JsonElement messageElement)) {
                            errorMessage = messageElement.GetString();
                        } else if (errorDoc.RootElement.TryGetProperty("title", out JsonElement titleElement)) {
                             errorMessage = titleElement.GetString();
                        }  else if (errorDoc.RootElement.TryGetProperty("error", out JsonElement errorElement) && errorElement.ValueKind == JsonValueKind.String) {
                            errorMessage = errorElement.GetString(); // Simple error string
                        }
                    } catch {
                        errorMessage = errorContent.Length < 100 ? errorContent : errorMessage;
                    }
                }
                await _feedbackService.ShowErrorAsync(errorMessage);
            }
            */

            // For simulation purposes:
            await _feedbackService.ShowSuccessAsync("Senha redefinida com sucesso! Você já pode fazer login com sua nova senha.");
            await Shell.Current.GoToAsync($"//{nameof(LoginPage)}");


        }
        catch (Exception ex)
        {
            Debug.WriteLine($"Reset Password Error: {ex.Message}");
            await _feedbackService.ShowErrorAsync("Ocorreu uma falha ao tentar redefinir sua senha. Tente novamente.");
        }
        finally
        {
            _feedbackService.HideLoading();
            // Keep button disabled on success as we navigate away
            if (SubmitButton.IsEnabled) // Only re-enable if it was not a success navigation
            {
                 SubmitButton.IsEnabled = true;
            }
        }
    }
}
