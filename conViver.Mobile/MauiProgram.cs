using Microsoft.Extensions.Logging;

namespace conViver.Mobile;

public static class MauiProgram
{
	public static MauiApp CreateMauiApp()
	{
		var builder = MauiApp.CreateBuilder();
		builder
			.UseMauiApp<App>()
			.ConfigureFonts(fonts =>
			{
				fonts.AddFont("OpenSans-Regular.ttf", "OpenSansRegular");
				fonts.AddFont("OpenSans-Semibold.ttf", "OpenSansSemibold");
			});

#if DEBUG
		builder.Logging.AddDebug();
#endif
		// Register Pages and Services
		builder.Services.AddSingleton<MainPage>();
		builder.Services.AddSingleton<LoginPage>();
		builder.Services.AddSingleton<Services.IFeedbackService, Services.FeedbackService>();

		return builder.Build();
	}
}
