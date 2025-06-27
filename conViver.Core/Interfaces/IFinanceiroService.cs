using conViver.Core.Entities;
using conViver.Core.DTOs;

namespace conViver.Core.Interfaces;

public interface IFinanceiroService
{
    // Cobranças
    Task<DashboardFinanceiroCobrancasDto> GetDashboardCobrancasAsync(Guid condominioId);
    Task<IEnumerable<CobrancaDto>> ListarCobrancasAsync(Guid condominioId, string? status);
    Task<CobrancaDto?> GetCobrancaByIdAsync(Guid id);
    Task<CobrancaDto> CriarCobrancaAsync(Guid condominioId, NovaCobrancaDto novaCobrancaDto);
    Task<ResultadoOperacaoDto> GerarCobrancasEmLoteAsync(Guid condominioId, GeracaoLoteRequestDto request);
    Task<string?> ObterLinkSegundaViaAsync(Guid cobrancaId);
    Task<ResultadoOperacaoDto> CancelarCobrancaAsync(Guid cobrancaId);
    Task<Boleto?> GetBoletoByIdAsync(Guid id, CancellationToken ct = default);
    Task<BoletoPdfDto?> ObterBoletoPdfAsync(Guid id);
    Task<bool> ReenviarBoletoAsync(Guid id);
    Task<PagamentoDto?> RegistrarPagamentoManualAsync(Guid boletoId, decimal valor, DateTime dataPagamento);
    Task<bool> ProcessarWebhookAsync(PagamentoWebhookDto dto);
    Task<bool> SolicitarEstornoAsync(Guid pagamentoId, string motivo);

    // Acordos
    Task<InstallmentPlanDto> CriarAcordoAsync(Guid unidadeId, decimal entrada, short parcelas);
    Task<InstallmentPlanDto?> ObterAcordoPorIdAsync(Guid acordoId);

    // Despesas
    Task<DespesaDto> CriarDespesaAsync(Guid condominioId, Guid usuarioId, DespesaInputDto input);
    Task<IEnumerable<DespesaDto>> ListarDespesasAsync(Guid condominioId, string? categoria, string? mesCompetencia);
    Task<DespesaDto?> ObterDespesaPorIdAsync(Guid id, Guid condominioId);
    Task<DespesaDto?> AtualizarDespesaAsync(Guid id, Guid condominioId, Guid usuarioId, DespesaInputDto input);
    Task<bool> RemoverDespesaAsync(Guid id, Guid condominioId, Guid usuarioId);

    // Balancetes
    Task<BalanceteDto?> GerarBalanceteAsync(Guid condominioId, DateTime inicio, DateTime fim);

    // Orçamento anual
    Task<IEnumerable<OrcamentoAnualDto>> RegistrarOrcamentoAsync(
        Guid condominioId,
        int ano,
        IEnumerable<OrcamentoCategoriaInputDto> categorias,
        CancellationToken cancellationToken = default);

    Task<IEnumerable<OrcamentoAnualDto>> ObterOrcamentoAsync(
        Guid condominioId,
        int ano,
        CancellationToken cancellationToken = default);

    Task<IEnumerable<OrcamentoComparativoDto>> CompararExecucaoOrcamentoAsync(
        Guid condominioId,
        int ano,
        CancellationToken cancellationToken = default);

    // Operação genérica de registro de pagamento (mantida para compatibilidade)
    Task RegistrarPagamentoAsync(Boleto boleto, decimal valor, CancellationToken cancellationToken = default);
}
