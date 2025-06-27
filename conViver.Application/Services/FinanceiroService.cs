using conViver.Core.DTOs;
using conViver.Core.Entities;
using conViver.Core.Interfaces;
using conViver.Core.Enums;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
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
        private readonly IRepository<Despesa> _despesaRepository;
        private readonly IRepository<OrcamentoAnual> _orcamentoRepository;
        private readonly IRepository<LancamentoFinanceiro> _lancamentoRepository;
        private readonly INotificacaoService _notificacaoService;

        public FinanceiroService(
            IRepository<Boleto> boletoRepository,
            IRepository<Unidade> unidadeRepository,
            IRepository<Pagamento> pagamentoRepository,
            IRepository<Acordo> acordoRepository,
            IRepository<ParcelaAcordo> parcelaRepository,
            IRepository<Despesa> despesaRepository,
            IRepository<OrcamentoAnual> orcamentoRepository,
            IRepository<LancamentoFinanceiro> lancamentoRepository,
            INotificacaoService notificacaoService)
        {
            _boletoRepository = boletoRepository;
            _unidadeRepository = unidadeRepository;
            _pagamentoRepository = pagamentoRepository;
            _acordoRepository = acordoRepository;
            _parcelaRepository = parcelaRepository;
            _despesaRepository = despesaRepository;
            _orcamentoRepository = orcamentoRepository;
            _lancamentoRepository = lancamentoRepository;
            _notificacaoService = notificacaoService;
        }

        public async Task<DashboardFinanceiroCobrancasDto> GetDashboardCobrancasAsync(Guid condominioId)
        {
            var boletos = await (from b in _boletoRepository.Query()
                                 join u in _unidadeRepository.Query() on b.UnidadeId equals u.Id
                                 where u.CondominioId == condominioId
                                 select b)
                                .ToListAsync();

            var hoje = DateTime.UtcNow;

            var pendentes = boletos.Count(b =>
                b.Status == BoletoStatus.Gerado ||
                b.Status == BoletoStatus.Registrado ||
                b.Status == BoletoStatus.Enviado ||
                b.Status == BoletoStatus.Vencido);

            var boletosMes = boletos.Where(b =>
                b.DataVencimento.Year == hoje.Year &&
                b.DataVencimento.Month == hoje.Month &&
                b.Status != BoletoStatus.Cancelado)
                .ToList();

            var valorPrevisto = boletosMes.Sum(b => b.Valor);

            var pagamentosMes = await (from p in _pagamentoRepository.Query()
                                       join b in _boletoRepository.Query() on p.BoletoId equals b.Id
                                       join u in _unidadeRepository.Query() on b.UnidadeId equals u.Id
                                       where u.CondominioId == condominioId &&
                                             p.DataPgto.Year == hoje.Year &&
                                             p.DataPgto.Month == hoje.Month
                                       select new { p.ValorPago, p.Origem })
                                      .ToListAsync();

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
                        select new { boleto, unidade.Identificacao };

            if (!string.IsNullOrWhiteSpace(status)
                && Enum.TryParse<BoletoStatus>(status, true, out var st))
            {
                if (status.Equals("Pendente", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(x =>
                        x.boleto.Status == BoletoStatus.Gerado ||
                        x.boleto.Status == BoletoStatus.Registrado ||
                        x.boleto.Status == BoletoStatus.Enviado ||
                        x.boleto.Status == BoletoStatus.Vencido);
                }
                else
                {
                    query = query.Where(x => x.boleto.Status == st);
                }
            }

            return await query
                .Select(x => new CobrancaDto
                {
                    Id = x.boleto.Id,
                    UnidadeId = x.boleto.UnidadeId,
                    NomeSacado = $"Unidade {x.Identificacao}",
                    Valor = x.boleto.Valor,
                    DataVencimento = x.boleto.DataVencimento,
                    StatusCobranca = x.boleto.Status.ToString(),
                    LinkSegundaVia = $"/api/v1/financeiro/cobrancas/{x.boleto.Id}/segunda-via"
                })
                .ToListAsync();
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

        public async Task<CobrancaDto> CriarCobrancaAsync(Guid condominioId, NovaCobrancaDto dto)
        {
            if (dto.DataVencimento.Date < DateTime.UtcNow.Date.AddDays(3))
                throw new InvalidOperationException("Data de vencimento inválida. Deve ser pelo menos 3 dias no futuro.");

            var boleto = new Boleto
            {
                Id = Guid.NewGuid(),
                UnidadeId = dto.UnidadeId,
                Valor = dto.Valor,
                DataVencimento = dto.DataVencimento.Date
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

            var unidades = await _unidadeRepository.Query()
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
                return new ResultadoOperacaoDto
                {
                    Sucesso = true,
                    Mensagem = "Nenhuma descrição de padrão de cobrança fornecida ou valor total é zero. Nenhum boleto foi gerado."
                };

            var novosBoletos = unidades.Select(u => new Boleto
            {
                Id = Guid.NewGuid(),
                UnidadeId = u.Id,
                Valor = valorTotalLote,
                DataVencimento = dataVencimento
            }).ToList();

            foreach (var b in novosBoletos)
                await _boletoRepository.AddAsync(b);

            await _boletoRepository.SaveChangesAsync();
            await _notificacaoService.SendAsync($"condo:{condominioId}", $"{novosBoletos.Count} boletos gerados com sucesso.");

            return new ResultadoOperacaoDto { Sucesso = true, Mensagem = $"{novosBoletos.Count} boletos gerados com sucesso." };
        }

        public async Task<string?> ObterLinkSegundaViaAsync(Guid cobrancaId)
        {
            var boleto = await _boletoRepository.GetByIdAsync(cobrancaId);
            if (boleto == null) return null;
            if (boleto.Status == BoletoStatus.Pago || boleto.Status == BoletoStatus.Cancelado)
                return null;

            await Task.Delay(20);
            return $"https://example.com/segunda-via/{boleto.Id}/pdf";
        }

        public async Task<ResultadoOperacaoDto> CancelarCobrancaAsync(Guid cobrancaId)
        {
            var boleto = await _boletoRepository.GetByIdAsync(cobrancaId);
            if (boleto == null)
                return new ResultadoOperacaoDto { Sucesso = false, Mensagem = "Cobrança não encontrada." };

            try
            {
                boleto.Cancelar();
                await _boletoRepository.UpdateAsync(boleto);
                await _boletoRepository.SaveChangesAsync();
                return new ResultadoOperacaoDto { Sucesso = true, Mensagem = "Cobrança cancelada com sucesso." };
            }
            catch (InvalidOperationException ex)
            {
                return new ResultadoOperacaoDto { Sucesso = false, Mensagem = ex.Message };
            }
        }

        public Task<Boleto?> GetBoletoByIdAsync(Guid id, CancellationToken ct = default)
            => _boletoRepository.GetByIdAsync(id, ct);

        public async Task<BoletoPdfDto?> ObterBoletoPdfAsync(Guid id)
        {
            var boleto = await _boletoRepository.GetByIdAsync(id);
            if (boleto == null) return null;
            var dummy = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes($"Boleto {id}"));
            return new BoletoPdfDto
            {
                PdfBase64 = dummy,
                BrCode = $"BR-CODE-{id:N}",
                Metadados = new Dictionary<string, object>
                {
                    ["valor"] = boleto.Valor,
                    ["status"] = boleto.Status.ToString()
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
            var boleto = await _boletoRepository.GetByIdAsync(boletoId);
            if (boleto == null) return null;

            boleto.RegistrarPagamento(valor, dataPagamento);
            await _boletoRepository.UpdateAsync(boleto);

            var pagamento = new Pagamento
            {
                Id = Guid.NewGuid(),
                BoletoId = boletoId,
                Origem = "manual",
                ValorPago = valor,
                DataPgto = dataPagamento
            };

            await _pagamentoRepository.AddAsync(pagamento);
            await _boletoRepository.SaveChangesAsync();
            await _pagamentoRepository.SaveChangesAsync();

            var unidade = await _unidadeRepository.GetByIdAsync(boleto.UnidadeId);
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
            var boleto = await _boletoRepository.Query()
                .FirstOrDefaultAsync(b => b.NossoNumero == dto.NossoNumero);
            if (boleto == null) return false;

            boleto.RegistrarPagamento(dto.ValorPago, dto.DataPagamento);
            await _boletoRepository.UpdateAsync(boleto);

            var pagamento = new Pagamento
            {
                Id = Guid.NewGuid(),
                BoletoId = boleto.Id,
                Origem = "webhook",
                ValorPago = dto.ValorPago,
                DataPgto = dto.DataPagamento,
                TraceId = dto.TraceId
            };

            await _pagamentoRepository.AddAsync(pagamento);
            await _boletoRepository.SaveChangesAsync();
            await _pagamentoRepository.SaveChangesAsync();

            var unidade = await _unidadeRepository.GetByIdAsync(boleto.UnidadeId);
            if (unidade != null)
            {
                var msg = $"Cobrança paga - Unidade {unidade.Identificacao} pagou {dto.ValorPago:C} em {dto.DataPagamento:dd/MM}.";
                await _notificacaoService.SendAsync($"condo:{unidade.CondominioId}", msg);
            }

            return true;
        }

        public async Task<bool> SolicitarEstornoAsync(Guid pagamentoId, string motivo)
        {
            var pag = await _pagamentoRepository.GetByIdAsync(pagamentoId);
            if (pag == null) return false;

            pag.Status = PagamentoStatus.Estornado;
            pag.UpdatedAt = DateTime.UtcNow;
            await _pagamentoRepository.UpdateAsync(pag);
            await _pagamentoRepository.SaveChangesAsync();
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
            await _acordoRepository.AddAsync(acordo);

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
                await _parcelaRepository.AddAsync(p);
            }

            await _acordoRepository.SaveChangesAsync();
            await _parcelaRepository.SaveChangesAsync();

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
            var acordo = await _acordoRepository.GetByIdAsync(acordoId);
            if (acordo == null) return null;

            var parcelas = await _parcelaRepository.Query()
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

        public async Task<IEnumerable<DespesaDto>> ListarDespesasAsync(Guid condominioId, string? categoria, string? mesCompetencia)
        {
            var query = _despesaRepository.Query()
                .Where(d => d.CondominioId == condominioId);

            if (!string.IsNullOrWhiteSpace(categoria))
                query = query.Where(d => d.Categoria != null && d.Categoria.Equals(categoria, StringComparison.OrdinalIgnoreCase));

            if (!string.IsNullOrWhiteSpace(mesCompetencia) && DateTime.TryParse($"{mesCompetencia}-01", out var comp))
            {
                var start = new DateTime(comp.Year, comp.Month, 1);
                var end = start.AddMonths(1).AddDays(-1);
                query = query.Where(d => d.DataCompetencia >= start && d.DataCompetencia <= end);
            }

            return await query
                .OrderByDescending(d => d.DataCompetencia)
                .Select(d => MapDespesaToDto(d))
                .ToListAsync();
        }

        public async Task<DespesaDto?> ObterDespesaPorIdAsync(Guid id, Guid condominioId)
        {
            var d = await _despesaRepository.Query()
                .FirstOrDefaultAsync(x => x.Id == id && x.CondominioId == condominioId);
            return d == null ? null : MapDespesaToDto(d);
        }

        public async Task<DespesaDto> CriarDespesaAsync(Guid condominioId, Guid usuarioId, DespesaInputDto input)
        {
            var d = new Despesa
            {
                Id = Guid.NewGuid(),
                CondominioId = condominioId,
                Descricao = input.Descricao,
                Valor = input.Valor,
                DataCompetencia = input.DataCompetencia,
                DataVencimento = input.DataVencimento,
                Categoria = input.Categoria,
                Observacoes = input.Observacoes,
                DataRegistro = DateTime.UtcNow,
                Status = "Pendente",
                UsuarioRegistroId = usuarioId
            };

            await _despesaRepository.AddAsync(d);
            await _despesaRepository.SaveChangesAsync();
            return MapDespesaToDto(d);
        }

        public async Task<DespesaDto?> AtualizarDespesaAsync(Guid id, Guid condominioId, Guid usuarioId, DespesaInputDto input)
        {
            var d = await _despesaRepository.Query()
                .FirstOrDefaultAsync(x => x.Id == id && x.CondominioId == condominioId);
            if (d == null) return null;

            d.Descricao = input.Descricao;
            d.Valor = input.Valor;
            d.DataCompetencia = input.DataCompetencia;
            d.DataVencimento = input.DataVencimento;
            d.Categoria = input.Categoria;
            d.Observacoes = input.Observacoes;
            d.UsuarioRegistroId = usuarioId;

            await _despesaRepository.UpdateAsync(d);
            await _despesaRepository.SaveChangesAsync();
            return MapDespesaToDto(d);
        }

        public async Task<bool> RemoverDespesaAsync(Guid id, Guid condominioId, Guid usuarioId)
        {
            var d = await _despesaRepository.Query()
                .FirstOrDefaultAsync(x => x.Id == id && x.CondominioId == condominioId);
            if (d == null) return false;

            await _despesaRepository.DeleteAsync(d);
            await _despesaRepository.SaveChangesAsync();
            return true;
        }

        public async Task<BalanceteDto?> GerarBalanceteAsync(Guid condominioId, DateTime inicio, DateTime fim)
        {
            var despesas = await _despesaRepository.Query()
                .Where(d => d.CondominioId == condominioId && d.DataCompetencia >= inicio && d.DataCompetencia <= fim)
                .ToListAsync();

            var receitas = await (from b in _boletoRepository.Query()
                                  join u in _unidadeRepository.Query() on b.UnidadeId equals u.Id
                                  where u.CondominioId == condominioId
                                        && b.DataVencimento >= inicio
                                        && b.DataVencimento <= fim
                                  select new BalanceteItemDto
                                  {
                                      Categoria = "Cobrança",
                                      Descricao = $"Boleto {b.Id:D8}",
                                      Valor = b.Valor,
                                      Data = b.DataVencimento
                                  })
                                 .ToListAsync();

            var despesasItems = despesas.Select(d => new BalanceteItemDto
            {
                Categoria = d.Categoria ?? "Geral",
                Descricao = d.Descricao,
                Valor = d.Valor,
                Data = d.DataCompetencia
            }).ToList();

            var totalReceitas = receitas.Sum(r => r.Valor);
            var totalDespesas = despesasItems.Sum(d => d.Valor);

            return new BalanceteDto
            {
                PeriodoInicio = inicio,
                PeriodoFim = fim,
                SaldoAnterior = 0m,
                Receitas = receitas,
                Despesas = despesasItems,
                TotalReceitas = totalReceitas,
                TotalDespesas = totalDespesas,
                SaldoAtual = totalReceitas - totalDespesas
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
                await _orcamentoRepository.AddAsync(ent, cancellationToken);
                entidades.Add(ent);
            }

            await _orcamentoRepository.SaveChangesAsync(cancellationToken);

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
            var itens = await _orcamentoRepository.Query()
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
            var orcamento = await _orcamentoRepository.Query()
                .Where(o => o.CondominioId == condominioId && o.Ano == ano)
                .ToListAsync(cancellationToken);

            var gastos = await (from l in _lancamentoRepository.Query()
                                join u in _unidadeRepository.Query() on l.UnidadeId equals u.Id
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

        private static DespesaDto MapDespesaToDto(Despesa d) => new DespesaDto
        {
            Id = d.Id,
            Descricao = d.Descricao,
            Valor = d.Valor,
            DataCompetencia = d.DataCompetencia,
            DataVencimento = d.DataVencimento,
            Categoria = d.Categoria,
            Observacoes = d.Observacoes,
            DataRegistro = d.DataRegistro,
            Status = d.Status,
            UsuarioRegistroId = d.UsuarioRegistroId
        };
    }
}
