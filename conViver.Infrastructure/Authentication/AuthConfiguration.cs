using Microsoft.Extensions.Configuration;

namespace conViver.Infrastructure.Authentication;

public class AuthConfiguration
{
    public const string SectionName = "Auth";

    public string Issuer { get; init; } = "conViver";
    public string Audience { get; init; } = "conViver-app";
    public string Secret { get; init; } = "super-secret-key-change";
    public int ExpirationMinutes { get; init; } = 60;

    public static AuthConfiguration FromConfiguration(IConfiguration config)
    {
        var section = config.GetSection(SectionName);
        return section.Get<AuthConfiguration>() ?? new AuthConfiguration();
    }
}
