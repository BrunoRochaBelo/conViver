using conViver.Core.Entities;
using conViver.Core.Interfaces;
using conViver.Infrastructure.Authentication;
using conViver.Infrastructure.Cache;
using conViver.Infrastructure.Data.Contexts;
using conViver.Infrastructure.Data.Repositories;
using conViver.Infrastructure.Notifications;
using conViver.Infrastructure.Payments;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using StackExchange.Redis;

namespace conViver.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<ConViverDbContext>(options =>
            options.UseNpgsql(configuration["DB_CONNECTION"]));

        services.AddSingleton(AuthConfiguration.FromConfiguration(configuration));
        services.AddSingleton<JwtService>();

        services.AddSingleton<IConnectionMultiplexer>(_ => ConnectionMultiplexer.Connect(configuration["REDIS_CONNECTION"] ?? "localhost:6379"));
        services.AddSingleton<RedisCacheService>();

        services.AddScoped<INotificacaoService, NotificationService>();
        services.AddScoped<IFinanceiroService, PaymentGatewayService>();

        services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
        services.AddScoped<IRepository<Condominio>, CondominioRepository>();
        services.AddScoped<IRepository<Usuario>, UsuarioRepository>();

        return services;
    }
}
