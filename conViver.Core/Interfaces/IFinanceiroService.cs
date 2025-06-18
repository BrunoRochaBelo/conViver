using conViver.Core.Entities;

namespace conViver.Core.Interfaces;

public interface IFinanceiroService
{
    Task RegistrarPagamentoAsync(Boleto boleto, decimal valor, CancellationToken cancellationToken = default);
}
