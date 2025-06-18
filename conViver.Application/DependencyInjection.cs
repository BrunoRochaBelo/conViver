using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace conViver.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddTransient<CondominioService>();
        services.AddTransient<UsuarioService>();
        services.AddTransient<FinanceiroService>();
        services.AddTransient<ReservaService>();
        services.AddTransient<OrdemServicoService>();
        services.AddTransient<AvisoService>();
        services.AddTransient<VotacaoService>();

        services.AddValidatorsFromAssemblyContaining<CondominioValidator>();

        return services;
    }
}

