using conViver.Core.DTOs;
using conViver.Core.Entities;
using conViver.Core.Interfaces; // IRepository
using conViver.Core.Enums;      // BoletoStatus
using Microsoft.EntityFrameworkCore; // ToListAsync, IQueryable extensions
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace conViver.Application.Services
{
    public class FinanceiroService
    {
        private readonly IRepository<Boleto> _boletoRepository;
        private readonly IRepository<Unidade> _unidadeRepository;

        public FinanceiroService(IRepository<Boleto> boletoRepository, IRepository<Unidade> unidadeRepository)
        {
            _boletoRepository = boletoRepository;
            _unidadeRepository = unidadeRepository;
        }

        public async Task<DashboardFinanceiroCobrancasDto> GetDashboardCobrancasAsync(Guid condominioId)
        {
            // Mock implementation
            // Em produção, filtrar por condominioId antes de calcular
            await Task.Delay(100); // Simula trabalho assíncrono

            var todosBoletos = await _boletoRepository.Query().ToListAsync();
            var pendentes = todosBoletos.Count(b =>
                b.Status == BoletoStatus.Gerado ||
                b.Status == BoletoStatus.Registrado ||
                b.Status == BoletoStatus.Vencido);
            var pagosNoMes = todosBoletos.Count(b =>
                b.Status == BoletoStatus.Pago &&
                b.DataPagamento.HasValue &&
                b.DataPagamento.Value.Month == DateTime.UtcNow.Month &&
                b.DataPagamento.Value.Year == DateTime.UtcNow.Year);

            return new DashboardFinanceiroCobrancasDto
            {
                InadimplenciaPercentual = 10.5m,                         // Mock
                TotalPixMes = new Random().Next(500, 5000),              // Mock
                TotalBoletosPendentes = pendentes
            };
        }

        public async Task<IEnumerable<CobrancaDto>> ListarCobrancasAsync(Guid condominioId, string? status)
        {
            var query = _boletoRepository.Query();

            if (!string.IsNullOrWhiteSpace(status) &&
                Enum.TryParse<BoletoStatus>(status, true, out var st))
            {
                if (status.Equals("Pendente", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(b =>
                        b.Status == BoletoStatus.Gerado ||
                        b.Status == BoletoStatus.Registrado ||
                        b.Status == BoletoStatus.Enviado ||
                        b.Status == BoletoStatus.Vencido);
                }
                else
                {
                    query = query.Where(b => b.Status == st);
                }
            }

            return await query
                .Select(b => new CobrancaDto
                {
                    Id = b.Id,
                    UnidadeId = b.UnidadeId,
                    NomeSacado = "Proprietário Unidade " + b.UnidadeId.ToString().Substring(0, 4),
                    Valor = b.Valor,
                    DataVencimento = b.DataVencimento,
                    StatusCobranca = b.Status.ToString(),
                    LinkSegundaVia = $"/api/v1/financeiro/cobrancas/{b.Id}/segunda-via"
                })
                .ToListAsync();
        }

        public async Task<CobrancaDto?> GetCobrancaByIdAsync(Guid id)
        {
            var boleto = await _boletoRepository.GetByIdAsync(id);
            if (boleto == null) return null;

            return new CobrancaDto
            {
                Id = boleto.Id,
                UnidadeId = boleto.UnidadeId,
                NomeSacado = "Proprietário Unidade " + boleto.UnidadeId.ToString().Substring(0, 4),
                Valor = boleto.Valor,
                DataVencimento = boleto.DataVencimento,
                StatusCobranca = boleto.Status.ToString(),
                LinkSegundaVia = $"/api/v1/financeiro/cobrancas/{boleto.Id}/segunda-via"
            };
        }

        public async Task<CobrancaDto> CriarCobrancaAsync(Guid condominioId, NovaCobrancaDto novaCobrancaDto)
        {
            if (novaCobrancaDto.DataVencimento.Date < DateTime.UtcNow.Date.AddDays(3))
                throw new InvalidOperationException("Data de vencimento inválida. Deve ser pelo menos 3 dias no futuro.");

            var boleto = new Boleto
            {
                Id = Guid.NewGuid(),
                UnidadeId = novaCobrancaDto.UnidadeId,
                Valor = novaCobrancaDto.Valor,
                DataVencimento = novaCobrancaDto.DataVencimento.Date,
            };

            await _boletoRepository.AddAsync(boleto);
            await _boletoRepository.SaveChangesAsync();

            return new CobrancaDto
            {
                Id = boleto.Id,
                UnidadeId = boleto.UnidadeId,
                NomeSacado = "Proprietário Unidade " + boleto.UnidadeId.ToString().Substring(0, 4),
                Valor = boleto.Valor,
                DataVencimento = boleto.DataVencimento,
                StatusCobranca = boleto.Status.ToString(),
                LinkSegundaVia = $"/api/v1/financeiro/cobrancas/{boleto.Id}/segunda-via"
            };
        }

        public async Task<ResultadoOperacaoDto> GerarCobrancasEmLoteAsync(Guid condominioId, GeracaoLoteRequestDto request)
        {
            // Mock implementation
            await Task.Delay(100);
            Console.WriteLine($"Gerando cobranças em lote para Condomínio {condominioId}, Mês: {request.Mes}, Ano: {request.Ano}");
            if (request.DescricoesPadrao != null)
            {
                foreach (var desc in request.DescricoesPadrao)
                    Console.WriteLine($" - Item Padrão: {desc.Descricao}, Valor: {desc.Valor}");
            }

            return new ResultadoOperacaoDto
            {
                Sucesso = true,
                Mensagem = "Geração de cobranças em lote iniciada (simulação)."
            };
        }

        public async Task<string?> ObterLinkSegundaViaAsync(Guid cobrancaId)
        {
            await Task.Delay(50);
            var boleto = await _boletoRepository.GetByIdAsync(cobrancaId);
            if (boleto == null ||
                boleto.Status == BoletoStatus.Pago ||
                boleto.Status == BoletoStatus.Cancelado)
            {
                return null;
            }

            return $"https://example.com/segunda-via/{cobrancaId}";
        }

        public async Task<ResultadoOperacaoDto> CancelarCobrancaAsync(Guid cobrancaId)
        {
            var boleto = await _boletoRepository.GetByIdAsync(cobrancaId);
            if (boleto == null)
            {
                return new ResultadoOperacaoDto
                {
                    Sucesso = false,
                    Mensagem = "Cobrança não encontrada."
                };
            }

            try
            {
                boleto.Cancelar();
                await _boletoRepository.UpdateAsync(boleto);
                await _boletoRepository.SaveChangesAsync();
                return new ResultadoOperacaoDto
                {
                    Sucesso = true,
                    Mensagem = "Cobrança cancelada com sucesso."
                };
            }
            catch (InvalidOperationException ex)
            {
                Console.WriteLine($"Operação inválida ao cancelar cobrança {cobrancaId}: {ex.Message}");
                return new ResultadoOperacaoDto
                {
                    Sucesso = false,
                    Mensagem = ex.Message
                };
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Erro inesperado ao cancelar cobrança {cobrancaId}: {ex}");
                return new ResultadoOperacaoDto
                {
                    Sucesso = false,
                    Mensagem = "Erro ao cancelar a cobrança."
                };
            }
        }

        public Task<Boleto?> GetBoletoByIdAsync(Guid id, CancellationToken ct = default)
        {
            return _boletoRepository.GetByIdAsync(id, ct);
        }
    }
}
