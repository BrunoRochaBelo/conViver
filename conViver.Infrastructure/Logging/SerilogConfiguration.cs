using Serilog;

namespace conViver.Infrastructure.Logging;

public static class SerilogConfiguration
{
    public static void ConfigureLogging(WebApplicationBuilder builder)
    {
        Log.Logger = new LoggerConfiguration()
            .ReadFrom.Configuration(builder.Configuration)
            .WriteTo.Console()
            .CreateLogger();

        builder.Host.UseSerilog();
    }
}
