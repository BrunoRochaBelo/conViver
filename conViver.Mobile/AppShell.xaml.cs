namespace conViver.Mobile;

public partial class AppShell : Shell
{
	public AppShell()
	{
		InitializeComponent();

        // Register routes for the new pages
        Routing.RegisterRoute(nameof(ForgotPasswordPage), typeof(ForgotPasswordPage));
        Routing.RegisterRoute(nameof(ResetPasswordPage), typeof(ResetPasswordPage));
        Routing.RegisterRoute(nameof(RegisterPage), typeof(RegisterPage));
	}
}
