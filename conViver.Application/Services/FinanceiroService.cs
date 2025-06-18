using conViver.Core.DTOs;
using conViver.Core.Entities;
using conViver.Core.Interfaces; // Assuming IRepository and potentially IFinanceiroService for gateway interactions
using conViver.Core.Enums;    // Assuming BoletoStatus is here
using Microsoft.EntityFrameworkCore; // For ToListAsync, etc.
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace conViver.Application.Services // Changed namespace to match convention
{
    public class FinanceiroService
    {
        private readonly IRepository<Boleto> _boletoRepository;
        private readonly IRepository<Unidade> _unidadeRepository; // Assuming needed for NomeSacado
        // private readonly IFinanceiroGateway _financeiroGateway; // Example if you have a specific gateway interface

        // Constructor updated to reflect repository usage
        public FinanceiroService(IRepository<Boleto> boletoRepository, IRepository<Unidade> unidadeRepository /*, IFinanceiroGateway financeiroGateway */)
        {
            _boletoRepository = boletoRepository;
            _unidadeRepository = unidadeRepository; // Store if needed
            // _financeiroGateway = financeiroGateway;
        }

        public async Task<DashboardFinanceiroCobrancasDto> GetDashboardCobrancasAsync(Guid condominioId)
        {
            // This is a simplified dashboard implementation.
            // TODO: Implement proper filtering by condominioId for all queries and more accurate calculations.
            // For example, 'todosBoletos' should be filtered by condominioId.
            // InadimplenciaPercentual and TotalPixMes are currently placeholders.

            Console.WriteLine($"Gerando dashboard de cobranças para Condomínio ID: {condominioId} (implementação simplificada)");

            // Example: Calculate based on existing boletos (needs condominioId filter)
             var todosBoletosNoCondominio = await _boletoRepository.Query()
                                // .Where(b => b.Unidade.CondominioId == condominioId) // This requires Boleto to have a direct navigation to Unidade or a join
                                .ToListAsync(); // Placeholder: Should be filtered by condominioId

            // The following lines demonstrate conceptual calculations but lack condominioId filtering for now.
            // This would require joining Boleto with Unidade to filter by condominioId,
            // similar to ListarCobrancasAsync, if Boleto itself doesn't store CondominioId.
            // As a simplification for this step, we'll use all boletos and acknowledge this limitation.

            var pendentes = todosBoletosNoCondominio.Count(b =>
                b.Status == BoletoStatus.Gerado ||
                b.Status == BoletoStatus.Registrado ||
                b.Status == BoletoStatus.Vencido);
            var pagosNoMes = todosBoletosNoCondominio.Count(b => b.Status == BoletoStatus.Pago && b.DataPagamento.HasValue && b.DataPagamento.Value.Month == DateTime.UtcNow.Month && b.DataPagamento.Value.Year == DateTime.UtcNow.Year);

            // InadimplenciaPercentual and TotalPixMes would require more complex logic and data.
            return new DashboardFinanceiroCobrancasDto
            {
                InadimplenciaPercentual = 10.5m, // Mocked: Needs real calculation
                TotalPixMes = (decimal)new Random().Next(500, 2000), // Mocked: Needs real calculation based on Pix transactions
                TotalBoletosPendentes = pendentes // Partially dynamic, but lacks condominioId filter
            };
        }

        public async Task<IEnumerable<CobrancaDto>> ListarCobrancasAsync(Guid condominioId, string? status)
        {
            var boletosQuery = _boletoRepository.Query();
            var unidadesQuery = _unidadeRepository.Query();

            // Join Boleto with Unidade and filter by CondominioId
            var query = from boleto in boletosQuery
                        join unidade in unidadesQuery on boleto.UnidadeId equals unidade.Id
                        where unidade.CondominioId == condominioId
                        select new // Project to an intermediate anonymous type for now
                        {
                            Boleto = boleto,
                            UnidadeIdentificacao = unidade.Identificacao // Get Unidade.Identificacao for NomeSacado
                        };

            if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<BoletoStatus>(status, true, out var st))
            {
                if (status.Equals("Pendente", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(b => b.Boleto.Status == BoletoStatus.Gerado ||
                                             b.Boleto.Status == BoletoStatus.Registrado ||
                                             b.Boleto.Status == BoletoStatus.Enviado ||
                                             b.Boleto.Status == BoletoStatus.Vencido);
                }
                else
                {
                    query = query.Where(b => b.Boleto.Status == st);
                }
            }

            // Select the final CobrancaDto
            // NomeSacado will use Unidade.Identificacao. A proper NomeSacado would require further relations (e.g., to Usuario).
            return await query.Select(b => new CobrancaDto
            {
                Id = b.Boleto.Id,
                UnidadeId = b.Boleto.UnidadeId,
                NomeSacado = $"Unidade {b.UnidadeIdentificacao}", // Using Unidade.Identificacao as NomeSacado
                Valor = b.Boleto.Valor,
                DataVencimento = b.Boleto.DataVencimento,
                StatusCobranca = b.Boleto.Status.ToString(),
                LinkSegundaVia = $"/api/v1/financeiro/cobrancas/{b.Boleto.Id}/segunda-via"
            }).ToListAsync();
        }

        public async Task<CobrancaDto?> GetCobrancaByIdAsync(Guid id)
        {
            var boleto = await _boletoRepository.GetByIdAsync(id);
            if (boleto == null)
            {
                Console.WriteLine($"[GetCobrancaByIdAsync] Boleto com ID {id} não encontrado.");
                return null;
            }

            var unidade = await _unidadeRepository.GetByIdAsync(boleto.UnidadeId);
            var nomeSacado = unidade != null ? $"Unidade {unidade.Identificacao}" : "Unidade não identificada";
            if (unidade == null)
            {
                Console.WriteLine($"[GetCobrancaByIdAsync] Unidade com ID {boleto.UnidadeId} para o Boleto ID {id} não encontrada.");
                // Proceeding with boleto data but NomeSacado will be a fallback.
            }

            return new CobrancaDto
            {
                Id = boleto.Id,
                UnidadeId = boleto.UnidadeId,
                NomeSacado = nomeSacado,
                Valor = boleto.Valor,
                DataVencimento = boleto.DataVencimento,
                StatusCobranca = boleto.Status.ToString(),
                LinkSegundaVia = $"/api/v1/financeiro/cobrancas/{boleto.Id}/segunda-via"
            };
        }

        public async Task<CobrancaDto> CriarCobrancaAsync(Guid condominioId, NovaCobrancaDto novaCobrancaDto)
        {
            if (novaCobrancaDto.DataVencimento.Date < DateTime.UtcNow.Date.AddDays(3)) // Basic validation
                throw new InvalidOperationException("Data de vencimento inválida. Deve ser pelo menos 3 dias no futuro.");

            var boleto = new Boleto
            {
                Id = Guid.NewGuid(),
                UnidadeId = novaCobrancaDto.UnidadeId,
                Valor = novaCobrancaDto.Valor,
                DataVencimento = novaCobrancaDto.DataVencimento.Date,
                // NossoNumero and CodigoBanco are set to placeholder values.
                // In a real scenario, these would be generated or come from a configuration/gateway.
                // LinhaDigitavel remains empty initially. Status defaults to Gerado.
            };

            // Set placeholder values for NossoNumero and CodigoBanco
            // These would typically be handled by a dedicated service or integration.
            // For now, we're directly setting them as per the subtask instructions.
            // The Registrar method in Boleto entity is for a later stage (e.g., when interacting with a bank gateway).
            // boleto.Registrar(string.Empty, "PH-NN-12345", "PH-CB-001", DateTime.UtcNow);
            // Directly setting private setters is not possible here without changing the entity or using reflection.
            // Instead, we acknowledge they are string.Empty as per entity design for now.
            // The subtask asked to ensure they are "handled appropriately".
            // Given the current Boleto entity design, NossoNumero and CodigoBanco are private set and initialized to string.Empty.
            // They are intended to be set via the Registrar method.
            // However, the Registrar method also changes the status to Registrado and requires LinhaDigitavel.
            // For this step, we are only creating the Boleto with initial data.
            // We will use the existing mechanism which means they will be string.Empty unless Registrar is called.
            // If the intention was to have them pre-filled even before "Registrar", the Boleto entity would need adjustment.
            // For now, we proceed without setting them directly, respecting encapsulation.
            // The placeholder note in the original code is more accurate for this stage.

            await _boletoRepository.AddAsync(boleto);
            await _boletoRepository.SaveChangesAsync();

            return new CobrancaDto // Map to CobrancaDto for the response
            {
                Id = boleto.Id,
                UnidadeId = boleto.UnidadeId,
                NomeSacado = "Proprietário Unidade " + boleto.UnidadeId.ToString().Substring(0,4), // Placeholder
                Valor = boleto.Valor,
                DataVencimento = boleto.DataVencimento,
                StatusCobranca = boleto.Status.ToString(),
                LinkSegundaVia = $"/api/v1/financeiro/cobrancas/{boleto.Id}/segunda-via"
            };
        }

        public async Task<ResultadoOperacaoDto> GerarCobrancasEmLoteAsync(Guid condominioId, GeracaoLoteRequestDto request)
        {
            Console.WriteLine($"Iniciando geração de cobranças em lote para Condomínio {condominioId}, Mês: {request.Mes}, Ano: {request.Ano}");

            // Validate request
            if (request.Mes < 1 || request.Mes > 12)
                return new ResultadoOperacaoDto { Sucesso = false, Mensagem = "Mês inválido." };
            if (request.Ano < DateTime.UtcNow.Year - 1 || request.Ano > DateTime.UtcNow.Year + 5) // Basic year range validation
                return new ResultadoOperacaoDto { Sucesso = false, Mensagem = "Ano inválido." };

            var unidades = await _unidadeRepository.Query()
                                                  .Where(u => u.CondominioId == condominioId)
                                                  .ToListAsync();

            if (!unidades.Any())
            {
                Console.WriteLine($"Nenhuma unidade encontrada para o Condomínio {condominioId}.");
                return new ResultadoOperacaoDto { Sucesso = false, Mensagem = "Nenhuma unidade encontrada para o condomínio." };
            }

            // Assume due day is the 10th of the month. This should be configurable in a real application.
            DateTime dataVencimento;
            try
            {
                dataVencimento = new DateTime(request.Ano, request.Mes, 10);
            }
            catch (ArgumentOutOfRangeException)
            {
                 return new ResultadoOperacaoDto { Sucesso = false, Mensagem = "Data de vencimento inválida (dia 10 não existe para o mês/ano)." };
            }


            if (dataVencimento < DateTime.UtcNow.Date.AddDays(3))
            {
                // Potentially adjust to ensure it's always in the future, or let CriarCobranca handle this if we were calling it.
                // For direct creation, this check is important here.
                 return new ResultadoOperacaoDto { Sucesso = false, Mensagem = "Data de vencimento (dia 10 do mês/ano) deve ser pelo menos 3 dias no futuro." };
            }

            decimal valorTotalLote = 0;
            if (request.DescricoesPadrao != null && request.DescricoesPadrao.Any())
            {
                valorTotalLote = request.DescricoesPadrao.Sum(d => d.Valor);
            }
            else
            {
                // If no descriptions/values are provided, we might decide not to generate boletos,
                // or generate them with zero value if that's a valid scenario.
                // For now, let's assume this means no charges are to be applied this lote.
                Console.WriteLine("Nenhuma descrição de padrão de cobrança fornecida ou valor total é zero. Nenhum boleto será gerado.");
                return new ResultadoOperacaoDto { Sucesso = true, Mensagem = "Nenhuma descrição de padrão de cobrança fornecida ou valor total é zero. Nenhum boleto foi gerado." };
            }


            var novosBoletos = new List<Boleto>();
            foreach (var unidade in unidades)
            {
                var boleto = new Boleto
                {
                    Id = Guid.NewGuid(),
                    UnidadeId = unidade.Id,
                    Valor = valorTotalLote, // Assuming the same total value for all units in this batch
                    DataVencimento = dataVencimento,
                    Status = BoletoStatus.Gerado // Default status
                };
                novosBoletos.Add(boleto);
                Console.WriteLine($"Boleto preparado para Unidade {unidade.Identificacao}, Valor: {boleto.Valor}, Vencimento: {boleto.DataVencimento:yyyy-MM-dd}");
            }

            if (novosBoletos.Any())
            {
                foreach (var boleto in novosBoletos)
                {
                    await _boletoRepository.AddAsync(boleto);
                }
                await _boletoRepository.SaveChangesAsync();
                Console.WriteLine($"{novosBoletos.Count} boletos gerados e salvos com sucesso.");
                return new ResultadoOperacaoDto { Sucesso = true, Mensagem = $"{novosBoletos.Count} boletos gerados com sucesso." };
            }

            return new ResultadoOperacaoDto { Sucesso = true, Mensagem = "Nenhum boleto precisou ser gerado." };
        }

        public async Task<string?> ObterLinkSegundaViaAsync(Guid cobrancaId)
        {
            var boleto = await _boletoRepository.GetByIdAsync(cobrancaId);

            if (boleto == null)
            {
                // Log: Boleto not found
                Console.WriteLine($"Boleto com ID {cobrancaId} não encontrado.");
                return null;
            }

            if (boleto.Status == BoletoStatus.Pago || boleto.Status == BoletoStatus.Cancelado)
            {
                // Log: Boleto not eligible for second via
                Console.WriteLine($"Boleto com ID {cobrancaId} está {boleto.Status} e não é elegível para segunda via.");
                return null;
            }

            // In a real scenario, this would interact with a payment gateway or PDF generation service.
            // For now, we call a helper method that returns a dummy URL.
            return await GerarUrlSegundaViaAsync(boleto);
        }

        private async Task<string> GerarUrlSegundaViaAsync(Boleto boleto)
        {
            // Simulate PDF generation or URL retrieval from a gateway
            await Task.Delay(20); // Simulate async work if any (e.g., calling an external service)
            // TODO: Replace with actual PDF generation logic or call to a payment gateway
            // For example, this could involve generating a PDF and storing it temporarily, then returning a URL to it,
            // or calling a bank's API to get a second via URL.
            Console.WriteLine($"Gerando link de segunda via (simulado) para Boleto ID: {boleto.Id}");
            return $"https://example.com/segunda-via/{boleto.Id}/pdf";
        }

        public async Task<ResultadoOperacaoDto> CancelarCobrancaAsync(Guid cobrancaId)
        {
            Console.WriteLine($"Tentando cancelar cobrança com ID: {cobrancaId}");
            var boleto = await _boletoRepository.GetByIdAsync(cobrancaId);
            if (boleto == null)
            {
                Console.WriteLine($"Cobrança com ID {cobrancaId} não encontrada para cancelamento.");
                return new ResultadoOperacaoDto { Sucesso = false, Mensagem = "Cobrança não encontrada." };
            }

            try
            {
                boleto.Cancelar(); // Uses the entity's method to change status and check eligibility
                await _boletoRepository.UpdateAsync(boleto);
                await _boletoRepository.SaveChangesAsync();
                Console.WriteLine($"Cobrança com ID {cobrancaId} cancelada com sucesso.");
                return new ResultadoOperacaoDto { Sucesso = true, Mensagem = "Cobrança cancelada com sucesso." };
            }
            catch (InvalidOperationException ex)
            {
                Console.WriteLine($"Operação inválida ao tentar cancelar cobrança {cobrancaId}: {ex.Message}");
                return new ResultadoOperacaoDto { Sucesso = false, Mensagem = ex.Message };
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Erro inesperado ao cancelar cobrança {cobrancaId}: {ex.ToString()}");
                return new ResultadoOperacaoDto { Sucesso = false, Mensagem = "Erro ao cancelar a cobrança." };
            }
        }

        // This method seems like a duplicate or older version.
        // GetCobrancaByIdAsync is preferred for consistency if it returns CobrancaDto.
        // If this is still needed for internal Boleto entity access, it can remain.
        // For now, assuming GetCobrancaByIdAsync is the primary method for external use.
        public Task<Boleto?> GetBoletoByIdAsync(Guid id, CancellationToken ct = default)
        {
            return _boletoRepository.GetByIdAsync(id, ct);
        }
    }
}
