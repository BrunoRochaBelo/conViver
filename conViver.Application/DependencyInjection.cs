using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using conViver.Core.Interfaces;
// FluentValidation was already listed at the top
// Microsoft.Extensions.DependencyInjection was already listed at the top
using conViver.Application.Services; // This line covers the Services namespace

// Removed duplicate usings that were here
namespace conViver.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddTransient<CondominioService>();
        services.AddTransient<IUsuarioService, UsuarioService>();
        services.AddTransient<UsuarioService>();
        services.AddTransient<FinanceiroService>();
        services.AddTransient<ReservaService>();
        services.AddTransient<OrdemServicoService>();
        services.AddTransient<AvisoService>();
        services.AddTransient<VotacaoService>();
        services.AddTransient<VisitanteService>();
        services.AddTransient<EncomendaService>();
        services.AddTransient<DashboardService>(); // Add DashboardService registration

        services.AddValidatorsFromAssemblyContaining<CondominioValidator>();
        // If CondominioValidator is in a different namespace, adjust accordingly
        // Example: services.AddValidatorsFromAssemblyContaining(typeof(Validators.CondominioValidator));


        return services;
    }
}

