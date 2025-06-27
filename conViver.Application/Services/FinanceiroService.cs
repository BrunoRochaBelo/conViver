using conViver.Core.DTOs;
using conViver.Core.Entities;
using conViver.Core.Interfaces;
using conViver.Core.Enums;
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace conViver.Application.Services
{
    public class FinanceiroService : IFinanceiroService
    {
        private readonly IRepository<Boleto> _boletoRepository;
        private readonly IRepository<Unidade> _unidadeRepository;
        private readonly IRepository<Pagamento> _pagamentoRepository;
        private readonly IRepository<Acordo> _acordoRepository;
        private readonly IRepository<ParcelaAcordo> _parcelaRepository;
        private readonly IRepository<OrcamentoAnual> _orcamentoRepository;
        private readonly IRepository<LancamentoFinanceiro> _lancamentoRepository;
        private readonly INotificacaoService _notificacaoService;

        public FinanceiroService(
            IRepository<Boleto> boletoRepository,
            IRepository<Unidade> unidadeRepository,
            IRepository<Pagamento> pagamentoRepository,
            IRepository<Acordo> acordoRepository,
            IRepository<ParcelaAcordo> parcelaRepository,
            IRepository<OrcamentoAnual> orcamentoRepository,
            IRepository<LancamentoFinanceiro> lancamentoRepository,
            INotificacaoService notificacaoService)
        {
            _boletoRepository = boletoRepository;
            _unidadeRepository = unidadeRepository;
            _pagamentoRepository = pagamentoRepository;
            _acordoRepository = acordoRepository;
            _parcela_repository = parcelaRepository;
            _orcamentoRepository = orcamentoRepository;
            _lancamento_repository = lancamentoRepository;
            _notificacaoService = notificacaoService;
        }

        public async Task<DashboardFinanceiroCobrancasDto> GetDashboardCobrancasAsync(Guid condominioId)
        {
            var boletos = await (from b in _boletoRepository.Query()
                                 join u in _unidadeRepository.Query() on b.UnidadeId equals u.Id
                                 where u.CondominioId == condominioId
                                 select b).ToListAsync();

            var hoje = DateTime.UtcNow;

            var pendentes = boletos.Count(b =>
                b.Status == BoletoStatus.Gerado ||
                b.Status == BoletoStatus.Registrado ||
                b.Status == BoletoStatus.Enviado ||
                b.Status == BoletoStatus.Vencido);

            var boletosMes = boletos.Where(b =>
                b.DataVencimento.Year == hoje.Year &&
                b.DataVencimento.Month == hoje.Month &&
                b.Status != BoletoStatus.Cancelado).ToList();

            var valorPrevisto = boletosMes.Sum(b => b.Valor);

            var pagamentosMes = await (from p in _pagamentoRepository.Query()
                                       join b in _boletoRepository.Query() on p.BoletoId equals b.Id
                                       join u in _unidadeRepository.Query() on b.UnidadeId equals u.Id
                                       where u.CondominioId == condominioId &&
                                             p.DataPgto.Year == hoje.Year &&
                                             p.DataPgto.Month == hoje.Month
                                       select new { p.ValorPago, p.Origem }).ToListAsync();

            var valorPago = pagamentosMes.Sum(p => p.ValorPago);
            var totalPixMes = pagamentosMes
                .Where(p => p.Origem.Equals("pix", StringComparison.OrdinalIgnoreCase))
                .Sum(p => p.ValorPago);

            var valorAberto = valorPrevisto - valorPago;
            var inadimplencia = valorPrevisto == 0
                ? 0m
                : Math.Round((valorAberto / valorPrevisto) * 100m, 1);

            return new DashboardFinanceiroCobrancasDto
            {
                InadimplenciaPercentual = inadimplencia,
                TotalPixMes = totalPixMes,
                TotalBoletosPendentes = pendentes
            };
        }

        public async Task<IEnumerable<CobrancaDto>> ListarCobrancasAsync(Guid condominioId, string? status)
        {
            var boletosQuery = _boletoRepository.Query();
            var unidadesQuery = _unidadeRepository.Query();

            var query = from boleto in boletosQuery
                        join unidade in unidadesQuery on boleto.UnidadeId equals unidade.Id
                        where unidade.CondominioId == condominioId
                        select new
                        {
                            Boleto = boleto,
                            UnidadeIdentificacao = unidade.Identificacao
                        };

            if (!string.IsNullOrWhiteSpace(status)
                && Enum.TryParse<BoletoStatus>(status, true, out var st))
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

            return await query.Select(b => new CobrancaDto
            {
                Id = b.Boleto.Id,
                UnidadeId = b.Boleto.UnidadeId,
                NomeSacado = $"Unidade {b.UnidadeIdentificacao}",
                Valor = b.Boleto.Valor,
                DataVencimento = b.Boleto.DataVencimento,
                StatusCobranca = b.Boleto.Status.ToString(),
                LinkSegundaVia = $"/api/v1/financeiro/cobrancas/{b.Boleto.Id}/segunda-via"
            }).ToListAsync();
        }

        public async Task<CobrancaDto?> GetCobrancaByIdAsync(Guid id)
        {
            var boleto = await _boletoRepository.GetByIdAsync(id);
            if (boleto == null) return null;

            var unidade = await _unidadeRepository.GetByIdAsync(boleto.UnidadeId);
            var nomeSacado = unidade != null
                ? $"Unidade {unidade.Identificacao}"
                : "Unidade não identificada";

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
            if (novaCobrancaDto.DataVencimento.Date < DateTime.UtcNow.Date.AddDays(3))
                throw new InvalidOperationException("Data de vencimento inválida. Deve ser pelo menos 3 dias no futuro.");

            var boleto = new Boleto
            {
                Id = Guid.NewGuid(),
                UnidadeId = novaCobrancaDto.UnidadeId,
                Valor = novaCobrancaDto.Valor,
                DataVencimento = novaCobrancaDto.DataVencimento.Date
            };

            await _boletoRepository.AddAsync(boleto);
            await _boletoRepository.SaveChangesAsync();

            var unidade = await _unidadeRepository.GetByIdAsync(boleto.UnidadeId);
            if (unidade != null)
            {
                var msg = $"Nova cobrança gerada para Unidade {unidade.Identificacao} no valor de {boleto.Valor:C} com vencimento {boleto.DataVencimento:dd/MM}.";
                await _notificacaoService.SendAsync($"condo:{unidade.CondominioId}", msg);
            }

            return new CobrancaDto
            {
                Id = boleto.Id,
                UnidadeId = boleto.UnidadeId,
                NomeSacado = "Proprietário Unidade " + boleto.UnidadeId.ToString()[..4],
                Valor = boleto.Valor,
                DataVencimento = boleto.DataVencimento,
                StatusCobranca = boleto.Status.ToString(),
                LinkSegundaVia = $"/api/v1/financeiro/cobrancas/{boleto.Id}/segunda-via"
            };
        }

        public async Task<ResultadoOperacaoDto> GerarCobrancasEmLoteAsync(Guid condominioId, GeracaoLoteRequestDto request)
        {
            if (request.Mes < 1 || request.Mes > 12)
                return new ResultadoOperacaoDto { Sucesso = false, Mensagem = "Mês inválido." };
            if (request.Ano < DateTime.UtcNow.Year - 1 || request.Ano > DateTime.UtcNow.Year + 5)
                return new ResultadoOperacaoDto { Sucesso = false, Mensagem = "Ano inválido." };

            var unidades = await _unidade_repository.Query()
                                                    .Where(u => u.CondominioId == condominioId)
                                                    .ToListAsync();
            if (!unidades.Any())
                return new ResultadoOperacaoDto { Sucesso = false, Mensagem = "Nenhuma unidade encontrada para o condomínio." };

            DateTime dataVencimento;
            try
            {
                dataVencimento = new DateTime(request.Ano, request.Mes, 10);
            }
            catch
            {
                return new ResultadoOperacaoDto { Sucesso = false, Mensagem = "Data de vencimento inválida (dia 10 não existe para o mês/ano)." };
            }
            if (dataVencimento < DateTime.UtcNow.Date.AddDays(3))
                return new ResultadoOperacaoDto { Sucesso = false, Mensagem = "Data de vencimento (dia 10 do mês/ano) deve ser pelo menos 3 dias no futuro." };

            var valorTotalLote = request.DescricoesPadrao?.Sum(d => d.Valor) ?? 0m;
            if (valorTotalLote == 0)
                return new ResultadoOperacaoDto { Sucesso = true, Mensagem = "Nenhuma descrição de padrão de cobrança fornecida ou valor total é zero. Nenhum boleto foi gerado." };

            var novosBoletos = unidades.Select(u => new Boleto
            {
                Id = Guid.NewGuid(),
                UnidadeId = u.Id,
                Valor = valorTotalLote,
                DataVencimento = dataVencimento
            }).ToList();

            foreach (var b in novosBoletos)
                await _boletoRepository.AddAsync(b);

            await _boleto_repository.SaveChangesAsync();

            await _notificacaoService.SendAsync($"condo:{condominioId}", $"{novosBoletos.Count} boletos gerados com sucesso.");
            return new ResultadoOperacaoDto { Sucesso = true, Mensagem = $"{novosBoletos.Count} boletos gerados com sucesso." };
        }

        public async Task<string?> ObterLinkSegundaViaAsync(Guid cobrancaId)
        {
            var boleto = await _boleto_repository.GetByIdAsync(cobrancaId);
            if (boleto == null) return null;
            if (boleto.Status == BoletoStatus.Pago || boleto.Status == BoletoStatus.Cancelado)
                return null;
            await Task.Delay(20);
            return $"https://example.com/segunda-via/{boleto.Id}/pdf";
        }

        public async Task<ResultadoOperacaoDto> CancelarCobrancaAsync(Guid cobrancaId)
        {
            var boleto = await _boleto_repository.GetByIdAsync(cobrancaId);
            if (boleto == null)
                return new ResultadoOperacaoDto { Sucesso = false, Mensagem = "Cobrança não encontrada." };

            try
            {
                boleto.Cancelar();
                await _boleto_repository.UpdateAsync(boleto);
                await _boleto_repository.SaveChangesAsync();
                return new ResultadoOperacaoDto { Sucesso = true, Mensagem = "Cobrança cancelada com sucesso." };
            }
            catch (InvalidOperationException ex)
            {
                return new ResultadoOperacaoDto { Sucesso = false, Mensagem = ex.Message };
            }
        }

        public Task<Boleto?> GetBoletoByIdAsync(Guid id, CancellationToken ct = default)
            => _boleto_repository.GetByIdAsync(id, ct);

        public async Task<BoletoPdfDto?> ObterBoletoPdfAsync(Guid id)
        {
            var boleto = await _boleto_repository.GetByIdAsync(id);
            if (boleto == null) return null;
            var dummy = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes($"Boleto {id}"));
            return new BoletoPdfDto
            {
                PdfBase64 = dummy,
                BrCode = $"BR-CODE-{id:N}",
                Metadados = new Dictionary<string, object>
                {
                    { "valor", boleto.Valor },
                    { "status", boleto.Status.ToString() }
                }
            };
        }

        public Task<bool> ReenviarBoletoAsync(Guid id) => Task.FromResult(true);

        public Task RegistrarPagamentoAsync(Boleto boleto, decimal valor, CancellationToken cancellationToken = default)
        {
            boleto.RegistrarPagamento(valor, DateTime.UtcNow);
            return Task.CompletedTask;
        }

        public async Task<PagamentoDto?> RegistrarPagamentoManualAsync(Guid boletoId, decimal valor, DateTime dataPagamento)
        {
            var boleto = await _boleto_repository.GetByIdAsync(boletoId);
            if (boleto == null) return null;
            boleto.RegistrarPagamento(valor, dataPagamento);
            await _boleto_repository.UpdateAsync(boleto);

            var pagamento = new Pagamento
            {
                Id = Guid.NewGuid(),
                BoletoId = boletoId,
                Origem = "manual",
                ValorPago = valor,
                DataPgto = dataPagamento
            };
            await _pagamento_repository.AddAsync(pagamento);
            await _boleto_repository.SaveChangesAsync();
            await _pagamento_repository.SaveChangesAsync();

            var unidade = await _unidade_repository.GetByIdAsync(boleto.UnidadeId);
            if (unidade != null)
            {
                var msg = $"Cobrança paga - Unidade {unidade.Identificacao} pagou {valor:C} em {dataPagamento:dd/MM}.";
                await _notificacaoService.SendAsync($"condo:{unidade.CondominioId}", msg);
            }

            return new PagamentoDto
            {
                PagamentoId = pagamento.Id,
                Status = pagamento.Status.ToString()
            };
        }

        public async Task<bool> ProcessarWebhookAsync(PagamentoWebhookDto dto)
        {
            var boleto = await _boleto_repository.Query()
                .FirstOrDefaultAsync(b => b.NossoNumero == dto.NossoNumero);
            if (boleto == null) return false;

            boleto.RegistrarPagamento(dto.ValorPago, dto.DataPagamento);
            await _boleto_repository.UpdateAsync(boleto);

            var pagamento = new Pagamento
            {
                Id = Guid.NewGuid(),
                BoletoId = boleto.Id,
                Origem = "webhook",
                ValorPago = dto.ValorPago,
                DataPgto = dto.DataPagamento,
                TraceId = dto.TraceId
            };
            await _pagamento_repository.AddAsync(pagamento);
            await _boleto_repository.SaveChangesAsync();
            await _pagamento_repository.SaveChangesAsync();

            var unidade = await _unidade_repository.GetByIdAsync(boleto.UnidadeId);
            if (unidade != null)
            {
                var msg = $"Cobrança paga - Unidade {unidade.Identificacao} pagou {dto.ValorPago:C} em {dto.DataPagamento:dd/MM}.";
                await _notificacaoService.SendAsync($"condo:{unidade.CondominioId}", msg);
            }
            return true;
        }

        public async Task<bool> SolicitarEstornoAsync(Guid pagamentoId, string motivo)
        {
            var pag = await _pagamento_repository.GetByIdAsync(pagamentoId);
            if (pag == null) return false;
            pag.Status = PagamentoStatus.Estornado;
            pag.UpdatedAt = DateTime.UtcNow;
            await _pagamento_repository.UpdateAsync(pag);
            await _pagamento_repository.SaveChangesAsync();
            return true;
        }

        public async Task<InstallmentPlanDto> CriarAcordoAsync(Guid unidadeId, decimal entrada, short parcelas)
        {
            var valorParcela = 100m;
            var acordo = new Acordo
            {
                Id = Guid.NewGuid(),
                UnidadeId = unidadeId,
                ValorTotal = entrada + valorParcela * parcelas,
                Entrada = entrada,
                Parcelas = parcelas
            };
            await _acordo_repository.AddAsync(acordo);

            var listaParcelas = new List<ParcelaAcordo>();
            for (short i = 1; i <= parcelas; i++)
            {
                var p = new ParcelaAcordo
                {
                    Id = Guid.NewGuid(),
                    AcordoId = acordo.Id,
                    Numero = i,
                    Valor = valorParcela,
                    Vencimento = DateTime.UtcNow.Date.AddMonths(i),
                    Pago = false
                };
                listaParcelas.Add(p);
                await _parcela_repository.AddAsync(p);
            }

            await _acordo_repository.SaveChangesAsync();
            await _parcela_repository.SaveChangesAsync();

            return new InstallmentPlanDto
            {
                Id = acordo.Id,
                ValorTotal = acordo.ValorTotal,
                Entrada = acordo.Entrada,
                Parcelas = listaParcelas.Select(x => new InstallmentDto
                {
                    Numero = x.Numero,
                    Valor = x.Valor,
                    Vencimento = x.Vencimento,
                    Pago = x.Pago
                }).ToList()
            };
        }

        public async Task<InstallmentPlanDto?> ObterAcordoPorIdAsync(Guid acordoId)
        {
            var acordo = await _acordo_repository.GetByIdAsync(acordoId);
            if (acordo == null) return null;

            var parcelas = await _parcela_repository.Query()
                .Where(p => p.AcordoId == acordoId)
                .OrderBy(p => p.Numero)
                .ToListAsync();

            return new InstallmentPlanDto
            {
                Id = acordo.Id,
                ValorTotal = acordo.ValorTotal,
                Entrada = acordo.Entrada,
                Parcelas = parcelas.Select(p => new InstallmentDto
                {
                    Numero = p.Numero,
                    Valor = p.Valor,
                    Vencimento = p.Vencimento,
                    Pago = p.Pago
                }).ToList()
            };
        }

        public async Task<IEnumerable<OrcamentoAnualDto>> RegistrarOrcamentoAsync(
            Guid condominioId,
            int ano,
            IEnumerable<OrcamentoCategoriaInputDto> categorias,
            CancellationToken cancellationToken = default)
        {
            var entidades = new List<OrcamentoAnual>();
            foreach (var cat in categorias)
            {
                var ent = new OrcamentoAnual
                {
                    Id = Guid.NewGuid(),
                    CondominioId = condominioId,
                    Ano = ano,
                    Categoria = cat.Categoria,
                    ValorPrevisto = cat.ValorPrevisto
                };
                await _orcamento_repository.AddAsync(ent, cancellationToken);
                entidades.Add(ent);
            }
            await _orcamento_repository.SaveChangesAsync(cancellationToken);

            return entidades.Select(e => new OrcamentoAnualDto
            {
                Id = e.Id,
                Ano = e.Ano,
                Categoria = e.Categoria,
                ValorPrevisto = e.ValorPrevisto
            });
        }

        public async Task<IEnumerable<OrcamentoAnualDto>> ObterOrcamentoAsync(
            Guid condominioId,
            int ano,
            CancellationToken cancellationToken = default)
        {
            var itens = await _orcamento_repository.Query()
                .Where(o => o.CondominioId == condominioId && o.Ano == ano)
                .ToListAsync(cancellationToken);

            return itens.Select(e => new OrcamentoAnualDto
            {
                Id = e.Id,
                Ano = e.Ano,
                Categoria = e.Categoria,
                ValorPrevisto = e.ValorPrevisto
            });
        }

        public async Task<IEnumerable<OrcamentoComparativoDto>> CompararExecucaoOrcamentoAsync(
            Guid condominioId,
            int ano,
            CancellationToken cancellationToken = default)
        {
            var orcamento = await _orcamento_repository.Query()
                .Where(o => o.CondominioId == condominioId && o.Ano == ano)
                .ToListAsync(cancellationToken);

            var gastos = await (from l in _lancamento_repository.Query()
                                join u in _unidade_repository.Query() on l.UnidadeId equals u.Id
                                where u.CondominioId == condominioId
                                      && l.Data.Year == ano
                                      && l.Tipo == "debito"
                                group l by l.Descricao into g
                                select new
                                {
                                    Categoria = g.Key!,
                                    Valor = g.Sum(x => x.Valor)
                                })
                               .ToListAsync(cancellationToken);

            return orcamento.Select(item =>
            {
                var exec = gastos.FirstOrDefault(g => g.Categoria == item.Categoria);
                return new OrcamentoComparativoDto
                {
                    Categoria = item.Categoria,
                    ValorPrevisto = item.ValorPrevisto,
                    ValorExecutado = exec?.Valor ?? 0m
                };
            });
        }

        public async Task<int> MarcarBoletosVencidosAsync()
        {
            var hoje = DateTime.UtcNow.Date;
            var pendentes = await _boleto_repository.Query()
                .Where(b =>
                    (b.Status == BoletoStatus.Gerado ||
                     b.Status == BoletoStatus.Registrado ||
                     b.Status == BoletoStatus.Enviado)
                    && b.DataVencimento.Date < hoje)
                .ToListAsync();

            foreach (var boleto in pendentes)
            {
                boleto.MarcarVencido(hoje);
                await _boleto_repository.UpdateAsync(boleto);

                var unidade = await _unidade_repository.GetByIdAsync(boleto.UnidadeId);
                if (unidade != null)
                {
                    var msg = $"Cobrança vencida - Unidade {unidade.Identificacao} no valor de {boleto.Valor:C}.";
                    await _notificacaoService.SendAsync($"condo:{unidade.CondominioId}", msg);
                }
            }

            if (pendentes.Any())
                await _boleto_repository.SaveChangesAsync();

            return pendentes.Count;
        }

        // --- Métodos simplificados para compatibilidade com os controllers ---
        public Task<DespesaDto> CriarDespesaAsync(Guid condominioId, Guid usuarioId, DespesaInputDto input)
            => Task.FromResult(new DespesaDto
            {
                Id = Guid.NewGuid(),
                Descricao = input.Descricao,
                Valor = input.Valor,
                DataCompetencia = input.DataCompetencia,
                DataVencimento = input.DataVencimento,
                Categoria = input.Categoria,
                Observacoes = input.Observacoes,
                DataRegistro = DateTime.UtcNow,
                Status = "Pendente",
                UsuarioRegistroId = usuarioId
            });

        public Task<IEnumerable<DespesaDto>> ListarDespesasAsync(Guid condominioId, string? categoria, string? mesCompetencia)
            => Task.FromResult<IEnumerable<DespesaDto>>(Array.Empty<DespesaDto>());

        public Task<DespesaDto?> ObterDespesaPorIdAsync(Guid id, Guid condominioId)
            => Task.FromResult<DespesaDto?>(null);

        public Task<DespesaDto?> AtualizarDespesaAsync(Guid id, Guid condominioId, Guid usuarioId, DespesaInputDto input)
            => Task.FromResult<DespesaDto?>(null);

        public Task<bool> RemoverDespesaAsync(Guid id, Guid condominioId, Guid usuarioId)
            => Task.FromResult(false);

        public Task<BalanceteDto?> GerarBalanceteAsync(Guid condominioId, DateTime inicio, DateTime fim)
            => Task.FromResult<BalanceteDto?>(null);
    }
}
