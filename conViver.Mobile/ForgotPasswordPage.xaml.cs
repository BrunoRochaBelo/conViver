using conViver.Mobile.Services;
using System;
using System.Diagnostics;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace conViver.Mobile;

public partial class ForgotPasswordPage : ContentPage
{
    private readonly IFeedbackService _feedbackService;
    // private static readonly HttpClient client = new HttpClient(); // Uncomment for actual API calls

    public ForgotPasswordPage(IFeedbackService feedbackService)
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
        if (string.IsNullOrWhiteSpace(EmailEntry.Text))
        {
            await _feedbackService.ShowErrorAsync("Por favor, informe seu e-mail.");
            return;
        }

        SubmitButton.IsEnabled = false;
        _feedbackService.ShowLoading("Enviando link..."); // This should handle LoadingIndicator and FeedbackLabel

        try
        {
            // Simulate API Call
            Debug.WriteLine($"Simulating API call to /api/v1/auth/forgot-password with email: {EmailEntry.Text}");
            await Task.Delay(1500); // Simulate network latency

            // ** Actual API Call Example (Uncomment and adjust) **
            /*
            var payload = new { Email = EmailEntry.Text };
            var jsonPayload = JsonSerializer.Serialize(payload);
            var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

            HttpResponseMessage response = await client.PostAsync("/api/v1/auth/forgot-password", content);

            if (response.IsSuccessStatusCode)
            {
                await _feedbackService.ShowSuccessAsync("Se um usuário com este e-mail existir em nosso sistema, um link para redefinição de senha foi enviado.");
                EmailEntry.Text = string.Empty;
            }
            else
            {
                // Attempt to read error message from response body
                string errorContent = await response.Content.ReadAsStringAsync();
                string errorMessage = "Ocorreu um erro ao enviar o link.";
                if (!string.IsNullOrWhiteSpace(errorContent)) {
                    try {
                        var errorDoc = JsonDocument.Parse(errorContent);
                        if (errorDoc.RootElement.TryGetProperty("message", out JsonElement messageElement)) {
                            errorMessage = messageElement.GetString();
                        } else if (errorDoc.RootElement.TryGetProperty("title", out JsonElement titleElement)) { // ASP.NET Core default problem details
                             errorMessage = titleElement.GetString();
                        }
                    } catch {
                        // Parsing failed, use generic message or raw content if short
                        errorMessage = errorContent.Length < 100 ? errorContent : errorMessage;
                    }
                }
                await _feedbackService.ShowErrorAsync(errorMessage);
            }
            */

            // For simulation purposes:
            await _feedbackService.ShowSuccessAsync("Se um usuário com este e-mail existir em nosso sistema, um link para redefinição de senha foi enviado.");
            EmailEntry.Text = string.Empty;

        }
        catch (Exception ex)
        {
            Debug.WriteLine($"Forgot Password Error: {ex.Message}");
            await _feedbackService.ShowErrorAsync("Ocorreu uma falha ao tentar enviar o link. Verifique sua conexão ou tente mais tarde.");
        }
        finally
        {
            _feedbackService.HideLoading();
            SubmitButton.IsEnabled = true;
        }
    }
}
