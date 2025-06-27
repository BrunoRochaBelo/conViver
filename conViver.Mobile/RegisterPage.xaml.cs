using conViver.Mobile.Services;
using System;
using System.Diagnostics;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace conViver.Mobile;

public partial class RegisterPage : ContentPage
{
    private readonly IFeedbackService _feedbackService;
    // private static readonly HttpClient client = new HttpClient(); // Uncomment for actual API calls

    public RegisterPage(IFeedbackService feedbackService)
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
        if (string.IsNullOrWhiteSpace(NameEntry.Text) ||
            string.IsNullOrWhiteSpace(EmailEntry.Text) ||
            string.IsNullOrWhiteSpace(PasswordEntry.Text) ||
            string.IsNullOrWhiteSpace(ConfirmPasswordEntry.Text))
        {
            await _feedbackService.ShowErrorAsync("Por favor, preencha todos os campos.");
            return;
        }

        if (PasswordEntry.Text != ConfirmPasswordEntry.Text)
        {
            await _feedbackService.ShowErrorAsync("As senhas não coincidem.");
            return;
        }

        if (PasswordEntry.Text.Length < 6)
        {
            await _feedbackService.ShowErrorAsync("A senha deve ter pelo menos 6 caracteres.");
            return;
        }

        SubmitButton.IsEnabled = false;
        _feedbackService.ShowLoading("Registrando...");

        try
        {
            // Simulate API Call
            Debug.WriteLine($"Simulating API call to /api/v1/auth/signup with Name: {NameEntry.Text}, Email: {EmailEntry.Text}");
            await Task.Delay(1500);

            // ** Actual API Call Example (Uncomment and adjust) **
            /*
            var payload = new
            {
                Nome = NameEntry.Text,
                Email = EmailEntry.Text,
                Senha = PasswordEntry.Text
            };
            var jsonPayload = JsonSerializer.Serialize(payload);
            var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

            HttpResponseMessage response = await client.PostAsync("/api/v1/auth/signup", content);

            if (response.IsSuccessStatusCode)
            {
                await _feedbackService.ShowSuccessAsync("Registro bem-sucedido! Você já pode fazer login.");
                // Optionally navigate to LoginPage or directly to main app area if auto-login after register
                await Shell.Current.GoToAsync($"//{nameof(LoginPage)}");
            }
            else
            {
                string errorContent = await response.Content.ReadAsStringAsync();
                string errorMessage = "Falha no registro. Verifique os dados ou tente um e-mail diferente.";
                if (response.StatusCode == System.Net.HttpStatusCode.Conflict) // 409
                {
                     errorMessage = "Este e-mail já está cadastrado. Tente fazer login ou use um e-mail diferente.";
                }
                else if (!string.IsNullOrWhiteSpace(errorContent))
                {
                    try
                    {
                        var errorDoc = JsonDocument.Parse(errorContent);
                        if (errorDoc.RootElement.TryGetProperty("message", out JsonElement messageElement)) {
                            errorMessage = messageElement.GetString();
                        } else if (errorDoc.RootElement.TryGetProperty("title", out JsonElement titleElement)) { // ASP.NET Core Problem Details
                             errorMessage = titleElement.GetString();
                        } else if (errorDoc.RootElement.TryGetProperty("errors", out JsonElement errorsElement)) { // ASP.NET Core Validation Problem Details
                            // Concatenate validation errors
                            var sb = new StringBuilder();
                            foreach(var propError in errorsElement.EnumerateObject()){
                                foreach(var err in propError.Value.EnumerateArray()){
                                    sb.AppendLine(err.GetString());
                                }
                            }
                            if(sb.Length > 0) errorMessage = sb.ToString();
                        }
                    } catch {
                         errorMessage = errorContent.Length < 200 ? errorContent : errorMessage; // Keep it short or generic
                    }
                }
                await _feedbackService.ShowErrorAsync(errorMessage);
            }
            */

            // For simulation purposes:
            // Simulate a 409 conflict sometimes
            if (EmailEntry.Text.ToLower().Contains("exists@example.com"))
            {
                await _feedbackService.ShowErrorAsync("Este e-mail já está cadastrado. Tente fazer login ou use um e-mail diferente.");
            }
            else
            {
                await _feedbackService.ShowSuccessAsync("Registro bem-sucedido! Você já pode fazer login.");
                await Shell.Current.GoToAsync($"//{nameof(LoginPage)}");
            }


        }
        catch (Exception ex)
        {
            Debug.WriteLine($"Registration Error: {ex.Message}");
            await _feedbackService.ShowErrorAsync("Ocorreu uma falha ao tentar registrar. Verifique sua conexão ou tente mais tarde.");
        }
        finally
        {
            _feedbackService.HideLoading();
            // Only re-enable if not successful navigation
            var currentPage = Shell.Current?.CurrentPage;
            if (currentPage == this) // Check if we are still on this page
            {
                SubmitButton.IsEnabled = true;
            }
        }
    }
}
