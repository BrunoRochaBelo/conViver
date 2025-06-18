using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using conViver.API.Middleware;
using conViver.Infrastructure.Authentication;
using conViver.Infrastructure.Logging;

var builder = WebApplication.CreateBuilder(args);

SerilogConfiguration.ConfigureLogging(builder);

builder.Services.AddControllers();

builder.Services.Configure<AuthConfiguration>(builder.Configuration.GetSection(AuthConfiguration.SectionName));
builder.Services.AddSingleton<JwtService>();

var authCfg = AuthConfiguration.FromConfiguration(builder.Configuration);
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = authCfg.Issuer,
            ValidAudience = authCfg.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(authCfg.Secret))
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

app.UseMiddleware<ExceptionMiddleware>();
app.UseMiddleware<RequestLoggingMiddleware>();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
