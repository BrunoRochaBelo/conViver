using Microsoft.Extensions.Configuration;
namespace conViver.Infrastructure.Authentication;

public class AuthConfiguration
{
    public string JwtSecret { get; init; } = string.Empty;
    public int ExpirationMinutes { get; init; } = 60;

    public static AuthConfiguration FromConfiguration(IConfiguration configuration)
    {
        return new AuthConfiguration
        {
            JwtSecret = configuration["JWT_SECRET"] ?? string.Empty,
            ExpirationMinutes = int.TryParse(configuration["JWT_EXP_MINUTES"], out var m) ? m : 60
        };
    }
}
