using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using conViver.Application.Services; // Ensure this line is present and correct

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
        services.AddTransient<VisitanteService>();
        services.AddTransient<EncomendaService>();
        services.AddTransient<DashboardService>(); // Add DashboardService registration
        services.AddTransient<CirculacaoService>();
        services.AddTransient<OcorrenciaService>();

        services.AddValidatorsFromAssemblyContaining<CondominioValidator>();
        // If CondominioValidator is in a different namespace, adjust accordingly
        // Example: services.AddValidatorsFromAssemblyContaining(typeof(Validators.CondominioValidator));


        return services;
    }
}

