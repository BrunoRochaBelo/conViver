using conViver.Core.Entities;
using conViver.Core.Interfaces;
using conViver.Core.Enums;
using Microsoft.Extensions.Logging;

namespace conViver.Infrastructure.Payments;

public class PaymentGatewayService : IFinanceiroService
{
    private readonly ILogger<PaymentGatewayService> _logger;

    public PaymentGatewayService(ILogger<PaymentGatewayService> logger)
    {
        _logger = logger;
    }

    public Task RegistrarPagamentoAsync(Boleto boleto, decimal valor, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Pagamento registrado para boleto {NossoNumero}", boleto.NossoNumero);

        // Use the Boleto entity's method to register payment
        boleto.RegistrarPagamento(valor, DateTime.UtcNow);

        return Task.CompletedTask;
    }
}
