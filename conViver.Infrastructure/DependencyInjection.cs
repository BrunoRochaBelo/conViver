using conViver.Core.Entities;
using conViver.Core.Interfaces;
using conViver.Infrastructure.Authentication;
using conViver.Infrastructure.Cache;
using conViver.Infrastructure.Data.Contexts;
using conViver.Infrastructure.Data.Repositories;
using conViver.Infrastructure.Notifications;
using conViver.Infrastructure.Payments;
using conViver.Application.Services;
using conViver.Infrastructure.Services; // Added for LocalStorageService
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
        {
            var connection = configuration["DB_CONNECTION"] ?? "Data Source=conViver.db";
            if (connection.Contains("Data Source="))
            {
                options.UseSqlite(connection);
            }
            else
            {
                options.UseNpgsql(connection);
            }
        });

        services.AddSingleton(AuthConfiguration.FromConfiguration(configuration));
        services.AddSingleton<JwtService>();

        services.AddMemoryCache();

        var redisConn = configuration["REDIS_CONNECTION"];
        if (!string.IsNullOrWhiteSpace(redisConn))
        {
            try
            {
                var mux = ConnectionMultiplexer.Connect(redisConn);
                services.AddSingleton<IConnectionMultiplexer>(mux);
                services.AddSingleton<ICacheService, RedisCacheService>();
            }
            catch
            {
                services.AddSingleton<ICacheService, InMemoryCacheService>();
            }
        }
        else
        {
            services.AddSingleton<ICacheService, InMemoryCacheService>();
        }

        services.AddScoped<INotificacaoService, NotificationService>();
        services.AddScoped<IFinanceiroService, FinanceiroService>();

        services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
        services.AddScoped<IRepository<Condominio>, CondominioRepository>();
        services.AddScoped<IRepository<Usuario>, UsuarioRepository>();
        services.AddScoped<IOcorrenciaRepository, OcorrenciaRepository>(); // Added OcorrenciaRepository

        services.AddSingleton<IFileStorageService, LocalStorageService>(); // Added FileStorageService

        return services;
    }
}
