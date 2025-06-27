using Xunit;
using Moq;
using conViver.Core.Interfaces;
using conViver.Core.Entities;
using conViver.Core.DTOs;
using conViver.Core.Enums;
using conViver.Application.Services;
using System;
using System.Threading.Tasks;
using System.Threading;
using System.Linq.Expressions;
using System.Collections.Generic;
using System.Linq;

namespace conViver.Tests.Application.Services
{
    public class FinanceiroServiceTests
    {
        private readonly Mock<IRepository<Boleto>> _mockBoletoRepository;
        private readonly Mock<IRepository<Unidade>> _mockUnidadeRepository;
        private readonly Mock<IRepository<Pagamento>> _mockPagamentoRepository;
        private readonly Mock<IRepository<Acordo>> _mockAcordoRepository;
        private readonly Mock<IRepository<ParcelaAcordo>> _mockParcelaRepository;
        private readonly Mock<IRepository<Despesa>> _mockDespesaRepository;
        private readonly Mock<IRepository<OrcamentoAnual>> _mockOrcamentoRepository;
        private readonly Mock<IRepository<LancamentoFinanceiro>> _mockLancamentoRepository;
        private readonly Mock<INotificacaoService> _mockNotificacaoService;
        private readonly FinanceiroService _financeiroService;

        public FinanceiroServiceTests()
        {
            _mockBoletoRepository = new Mock<IRepository<Boleto>>();
            _mockUnidadeRepository = new Mock<IRepository<Unidade>>();
            _mockPagamentoRepository = new Mock<IRepository<Pagamento>>();
            _mockAcordoRepository = new Mock<IRepository<Acordo>>();
            _mockParcelaRepository = new Mock<IRepository<ParcelaAcordo>>();
            _mockDespesaRepository = new Mock<IRepository<Despesa>>();
            _mockOrcamentoRepository = new Mock<IRepository<OrcamentoAnual>>();
            _mockLancamentoRepository = new Mock<IRepository<LancamentoFinanceiro>>();
            _mockNotificacaoService = new Mock<INotificacaoService>();

            _financeiroService = new FinanceiroService(
                _mockBoletoRepository.Object,
                _mockUnidadeRepository.Object,
                _mockPagamentoRepository.Object,
                _mockAcordoRepository.Object,
                _mockParcelaRepository.Object,
                _mockDespesaRepository.Object,
                _mockOrcamentoRepository.Object,
                _mockLancamentoRepository.Object,
                _mockNotificacaoService.Object
            );
        }

        // ---- Cobranças ----

        [Fact]
        public async Task CriarCobrancaAsync_ValidData_ShouldAddBoletoAndSaveChanges()
        {
            var condominioId = Guid.NewGuid();
            var dto = new NovaCobrancaDto
            {
                UnidadeId = Guid.NewGuid(),
                Valor = 100.50m,
                DataVencimento = DateTime.UtcNow.AddDays(10),
                Descricao = "Taxa Condominial"
            };
            _mockUnidadeRepository
                .Setup(r => r.GetByIdAsync(dto.UnidadeId, default))
                .ReturnsAsync(new Unidade { Id = dto.UnidadeId, CondominioId = condominioId, Identificacao = "101" });

            Boleto? captured = null;
            _mockBoletoRepository
                .Setup(r => r.AddAsync(It.IsAny<Boleto>(), default))
                .Callback<Boleto, CancellationToken>((b, _) => captured = b)
                .Returns(Task.CompletedTask);
            _mockBoletoRepository.Setup(r => r.SaveChangesAsync(default)).ReturnsAsync(1);

            var result = await _financeiroService.CriarCobrancaAsync(condominioId, dto);

            _mockBoletoRepository.Verify(r => r.AddAsync(It.IsAny<Boleto>(), default), Times.Once);
            _mockNotificacaoService.Verify(n => n.SendAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Once);
            Assert.NotNull(captured);
            Assert.Equal(dto.Valor, captured!.Valor);
            Assert.Equal(dto.DataVencimento.Date, captured.DataVencimento.Date);
            Assert.Equal(BoletoStatus.Gerado, captured.Status);
            Assert.Equal(captured.Id, result.Id);
        }

        [Fact]
        public async Task CriarCobrancaAsync_InvalidDataVencimento_ShouldThrow()
        {
            var condId = Guid.NewGuid();
            var dto = new NovaCobrancaDto
            {
                UnidadeId = Guid.NewGuid(),
                Valor = 50m,
                DataVencimento = DateTime.UtcNow.AddDays(1),
                Descricao = "Teste"
            };
            await Assert.ThrowsAsync<InvalidOperationException>(
                () => _financeiroService.CriarCobrancaAsync(condId, dto)
            );
        }

        [Fact]
        public async Task ObterLinkSegundaViaAsync_Eligible_ShouldReturnUrl()
        {
            var id = Guid.NewGuid();
            var boleto = new Boleto { Id = id, UnidadeId = Guid.NewGuid(), Valor = 100m, DataVencimento = DateTime.UtcNow.AddDays(5) };
            _mockBoletoRepository.Setup(r => r.GetByIdAsync(id, default)).ReturnsAsync(boleto);

            var url = await _financeiroService.ObterLinkSegundaViaAsync(id);

            Assert.Equal($"https://example.com/segunda-via/{id}/pdf", url);
        }

        [Fact]
        public async Task ObterLinkSegundaViaAsync_Nonexistent_ShouldReturnNull()
        {
            _mockBoletoRepository.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), default)).ReturnsAsync((Boleto?)null);
            var url = await _financeiroService.ObterLinkSegundaViaAsync(Guid.NewGuid());
            Assert.Null(url);
        }

        [Theory]
        [InlineData(BoletoStatus.Pago)]
        [InlineData(BoletoStatus.Cancelado)]
        public async Task ObterLinkSegundaViaAsync_IneligibleStatus_ShouldReturnNull(BoletoStatus status)
        {
            var id = Guid.NewGuid();
            var boleto = new Boleto { Id = id };
            typeof(Boleto).GetProperty("Status")!.SetValue(boleto, status);
            _mockBoletoRepository.Setup(r => r.GetByIdAsync(id, default)).ReturnsAsync(boleto);

            var url = await _financeiroService.ObterLinkSegundaViaAsync(id);
            Assert.Null(url);
        }

        [Fact]
        public async Task ListarCobrancasAsync_FiltersAndMapsCorrectly()
        {
            var condId = Guid.NewGuid();
            var other = Guid.NewGuid();
            var unidades = new[]
            {
                new Unidade { Id = Guid.NewGuid(), CondominioId = condId, Identificacao = "101" },
                new Unidade { Id = Guid.NewGuid(), CondominioId = condId, Identificacao = "102" },
                new Unidade { Id = Guid.NewGuid(), CondominioId = other, Identificacao = "201" }
            };
            var boletos = new[]
            {
                new Boleto { Id = Guid.NewGuid(), UnidadeId = unidades[0].Id, Valor = 100m, DataVencimento = DateTime.UtcNow.AddDays(5) },
                new Boleto { Id = Guid.NewGuid(), UnidadeId = unidades[1].Id, Valor = 200m, DataVencimento = DateTime.UtcNow.AddDays(5) },
                new Boleto { Id = Guid.NewGuid(), UnidadeId = unidades[2].Id, Valor = 300m, DataVencimento = DateTime.UtcNow.AddDays(5) }
            };
            typeof(Boleto).GetProperty("Status")!.SetValue(boletos[1], BoletoStatus.Pago);

            _mockUnidadeRepository.Setup(r => r.Query()).Returns(unidades.AsQueryable());
            _mockBoletoRepository.Setup(r => r.Query()).Returns(boletos.AsQueryable());

            var all = (await _financeiroService.ListarCobrancasAsync(condId, null)).ToList();
            Assert.Equal(2, all.Count);

            var pago = (await _financeiroService.ListarCobrancasAsync(condId, "Pago")).Single();
            Assert.Equal(boletos[1].Id, pago.Id);

            var pend = (await _financeiroService.ListarCobrancasAsync(condId, "Pendente")).Single();
            Assert.Equal(boletos[0].Id, pend.Id);
        }

        [Fact]
        public async Task GetCobrancaByIdAsync_Existing_ShouldMapDto()
        {
            var id = Guid.NewGuid();
            var uid = Guid.NewGuid();
            var boleto = new Boleto { Id = id, UnidadeId = uid, Valor = 150m, DataVencimento = DateTime.UtcNow.AddDays(7) };
            var unidade = new Unidade { Id = uid, CondominioId = Guid.NewGuid(), Identificacao = "202B" };
            _mockBoletoRepository.Setup(r => r.GetByIdAsync(id, default)).ReturnsAsync(boleto);
            _mockUnidadeRepository.Setup(r => r.GetByIdAsync(uid, default)).ReturnsAsync(unidade);

            var dto = await _financeiroService.GetCobrancaByIdAsync(id);

            Assert.NotNull(dto);
            Assert.Equal("Unidade 202B", dto!.NomeSacado);
        }

        [Fact]
        public async Task GetCobrancaByIdAsync_NotFound_ShouldReturnNull()
        {
            _mockBoletoRepository.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), default))
                .ReturnsAsync((Boleto?)null);
            var dto = await _financeiroService.GetCobrancaByIdAsync(Guid.NewGuid());
            Assert.Null(dto);
        }

        [Fact]
        public async Task GetCobrancaByIdAsync_BoletoExists_UnidadeMissing_ShouldFallbackNomeSacado()
        {
            var id = Guid.NewGuid();
            var uid = Guid.NewGuid();
            var boleto = new Boleto { Id = id, UnidadeId = uid, Valor = 100m };
            _mockBoletoRepository.Setup(r => r.GetByIdAsync(id, default)).ReturnsAsync(boleto);
            _mockUnidadeRepository.Setup(r => r.GetByIdAsync(uid, default)).ReturnsAsync((Unidade?)null);

            var dto = await _financeiroService.GetCobrancaByIdAsync(id);
            Assert.Equal("Unidade não identificada", dto!.NomeSacado);
        }

        [Fact]
        public async Task GerarCobrancasEmLoteAsync_ValidRequest_ShouldGenerateBoletos()
        {
            var condId = Guid.NewGuid();
            var req = new GeracaoLoteRequestDto
            {
                Mes = DateTime.UtcNow.Month,
                Ano = DateTime.UtcNow.Year,
                DescricoesPadrao = new[]
                {
                    new DescricaoPadraoDto { Descricao = "X", Valor = 100m }
                }
            };
            var today = DateTime.UtcNow;
            var due = new DateTime(req.Ano, req.Mes, 10);
            if (due < today.AddDays(3))
            {
                var nxt = today.AddMonths(1);
                req.Mes = nxt.Month;
                req.Ano = nxt.Year;
            }
            var unidades = new[]
            {
                new Unidade { Id = Guid.NewGuid(), CondominioId = condId, Identificacao = "301" },
                new Unidade { Id = Guid.NewGuid(), CondominioId = condId, Identificacao = "302" }
            };
            _mockUnidadeRepository.Setup(r => r.Query()).Returns(unidades.AsQueryable());

            var captured = new List<Boleto>();
            _mockBoletoRepository
                .Setup(r => r.AddAsync(It.IsAny<Boleto>(), default))
                .Callback<Boleto, CancellationToken>((b, _) => captured.Add(b));
            _mockBoletoRepository.Setup(r => r.SaveChangesAsync(default)).ReturnsAsync(unidades.Length);

            var res = await _financeiroService.GerarCobrancasEmLoteAsync(condId, req);
            Assert.True(res.Sucesso);
            Assert.Equal(unidades.Length, captured.Count);
        }

        [Fact]
        public async Task GerarCobrancasEmLoteAsync_NoUnidades_ShouldFail()
        {
            _mockUnidadeRepository.Setup(r => r.Query()).Returns(new List<Unidade>().AsQueryable());
            var res = await _financeiroService.GerarCobrancasEmLoteAsync(Guid.NewGuid(), new GeracaoLoteRequestDto
            {
                Mes = 1,
                Ano = DateTime.UtcNow.Year + 1,
                DescricoesPadrao = new[] { new DescricaoPadraoDto { Valor = 10m } }
            });
            Assert.False(res.Sucesso);
        }

        [Theory]
        [InlineData(0, 2024)]
        [InlineData(13, 2024)]
        [InlineData(1, 2000)]
        [InlineData(1, 2099)]
        public async Task GerarCobrancasEmLoteAsync_InvalidParams_ShouldFail(int mes, int ano)
        {
            _mockUnidadeRepository.Setup(r => r.Query()).Returns(new[] { new Unidade { Id = Guid.NewGuid(), CondominioId = Guid.NewGuid() } }.AsQueryable());
            var res = await _financeiroService.GerarCobrancasEmLoteAsync(Guid.NewGuid(), new GeracaoLoteRequestDto
            {
                Mes = mes,
                Ano = ano,
                DescricoesPadrao = new[] { new DescricaoPadraoDto { Valor = 10m } }
            });
            Assert.False(res.Sucesso);
        }

        [Fact]
        public async Task GerarCobrancasEmLoteAsync_EmptyDescriptions_ShouldSucceedNoBoletos()
        {
            _mockUnidadeRepository.Setup(r => r.Query()).Returns(new[] { new Unidade { Id = Guid.NewGuid(), CondominioId = Guid.NewGuid() } }.AsQueryable());
            var res = await _financeiroService.GerarCobrancasEmLoteAsync(Guid.NewGuid(), new GeracaoLoteRequestDto
            {
                Mes = DateTime.UtcNow.Month,
                Ano = DateTime.UtcNow.Year,
                DescricoesPadrao = Array.Empty<DescricaoPadraoDto>()
            });
            Assert.True(res.Sucesso);
        }

        [Fact]
        public async Task CancelarCobrancaAsync_Existing_ShouldCancel()
        {
            var id = Guid.NewGuid();
            var boleto = new Boleto { Id = id, UnidadeId = Guid.NewGuid(), Valor = 100m };
            _mockBoletoRepository.Setup(r => r.GetByIdAsync(id, default)).ReturnsAsync(boleto);
            _mockBoletoRepository.Setup(r => r.UpdateAsync(boleto, default)).Returns(Task.CompletedTask);
            _mockBoletoRepository.Setup(r => r.SaveChangesAsync(default)).ReturnsAsync(1);

            var res = await _financeiroService.CancelarCobrancaAsync(id);
            Assert.True(res.Sucesso);
            Assert.Equal(BoletoStatus.Cancelado, boleto.Status);
        }

        [Fact]
        public async Task CancelarCobrancaAsync_NotFound_ShouldFail()
        {
            _mockBoletoRepository.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), default)).ReturnsAsync((Boleto?)null);
            var res = await _financeiroService.CancelarCobrancaAsync(Guid.NewGuid());
            Assert.False(res.Sucesso);
        }

        [Fact]
        public async Task CancelarCobrancaAsync_Paid_ShouldFail()
        {
            var id = Guid.NewGuid();
            var boleto = new Boleto { Id = id };
            typeof(Boleto).GetProperty("Status")!.SetValue(boleto, BoletoStatus.Pago);
            _mockBoletoRepository.Setup(r => r.GetByIdAsync(id, default)).ReturnsAsync(boleto);

            var res = await _financeiroService.CancelarCobrancaAsync(id);
            Assert.False(res.Sucesso);
        }

        [Fact]
        public async Task RegistrarPagamentoManualAsync_ShouldNotify()
        {
            var id = Guid.NewGuid();
            var boleto = new Boleto { Id = id, UnidadeId = Guid.NewGuid(), Valor = 123m };
            var unidade = new Unidade { Id = boleto.UnidadeId, CondominioId = Guid.NewGuid(), Identificacao = "202" };
            _mockBoletoRepository.Setup(r => r.GetByIdAsync(id, default)).ReturnsAsync(boleto);
            _mockUnidadeRepository.Setup(r => r.GetByIdAsync(boleto.UnidadeId, default)).ReturnsAsync(unidade);
            _mockBoletoRepository.Setup(r => r.UpdateAsync(boleto, default)).Returns(Task.CompletedTask);
            _mockBoletoRepository.Setup(r => r.SaveChangesAsync(default)).ReturnsAsync(1);
            _mockPagamentoRepository.Setup(r => r.AddAsync(It.IsAny<Pagamento>(), default)).Returns(Task.CompletedTask);
            _mockPagamentoRepository.Setup(r => r.SaveChangesAsync(default)).ReturnsAsync(1);

            await _financeiroService.RegistrarPagamentoManualAsync(id, 123m, DateTime.UtcNow);
            _mockNotificacaoService.Verify(n => n.SendAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Once);
        }

        [Fact]
        public async Task MarcarBoletosVencidosAsync_ShouldMarkAndNotify()
        {
            var unidade = new Unidade { Id = Guid.NewGuid(), CondominioId = Guid.NewGuid(), Identificacao = "303" };
            var boleto = new Boleto { Id = Guid.NewGuid(), UnidadeId = unidade.Id, Valor = 50m, DataVencimento = DateTime.UtcNow.AddDays(-1) };
            _mockBoletoRepository.Setup(r => r.Query()).Returns(new[] { boleto }.AsQueryable());
            _mockBoletoRepository.Setup(r => r.UpdateAsync(boleto, default)).Returns(Task.CompletedTask);
            _mockUnidadeRepository.Setup(r => r.GetByIdAsync(unidade.Id, default)).ReturnsAsync(unidade);
            _mockBoletoRepository.Setup(r => r.SaveChangesAsync(default)).ReturnsAsync(1);

            var count = await _financeiroService.MarcarBoletosVencidosAsync();
            Assert.Equal(1, count);
            Assert.Equal(BoletoStatus.Vencido, boleto.Status);
            _mockNotificacaoService.Verify(n => n.SendAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Once);
        }

        [Fact]
        public async Task GetDashboardCobrancasAsync_NoData_ShouldReturnZeros()
        {
            _mockBoletoRepository.Setup(r => r.Query()).Returns(Array.Empty<Boleto>().AsQueryable());
            _mockUnidadeRepository.Setup(r => r.Query()).Returns(Array.Empty<Unidade>().AsQueryable());
            _mockPagamentoRepository.Setup(r => r.Query()).Returns(Array.Empty<Pagamento>().AsQueryable());

            var dto = await _financeiroService.GetDashboardCobrancasAsync(Guid.NewGuid());
            Assert.Equal(0m, dto.InadimplenciaPercentual);
            Assert.Equal(0m, dto.TotalPixMes);
            Assert.Equal(0, dto.TotalBoletosPendentes);
        }

        [Fact]
        public async Task GetDashboardCobrancasAsync_WithData_ShouldCalculate()
        {
            var condId = Guid.NewGuid();
            var other = Guid.NewGuid();
            var unidades = new[]
            {
                new Unidade { Id = Guid.NewGuid(), CondominioId = condId },
                new Unidade { Id = Guid.NewGuid(), CondominioId = condId },
                new Unidade { Id = Guid.NewGuid(), CondominioId = other }
            };
            var now = DateTime.UtcNow;
            var boletos = new[]
            {
                new Boleto { Id = Guid.NewGuid(), UnidadeId = unidades[0].Id, Valor = 100m, DataVencimento = new DateTime(now.Year, now.Month, 10) },
                new Boleto { Id = Guid.NewGuid(), UnidadeId = unidades[0].Id, Valor = 200m, DataVencimento = new DateTime(now.Year, now.Month, 15) },
                new Boleto { Id = Guid.NewGuid(), UnidadeId = unidades[1].Id, Valor = 300m, DataVencimento = new DateTime(now.Year, now.Month, 20) },
                new Boleto { Id = Guid.NewGuid(), UnidadeId = unidades[2].Id, Valor = 400m, DataVencimento = new DateTime(now.Year, now.Month, 10) }
            };
            typeof(Boleto).GetProperty("Status")!.SetValue(boletos[0], BoletoStatus.Pago);
            typeof(Boleto).GetProperty("Status")!.SetValue(boletos[2], BoletoStatus.Vencido);

            var pagamentos = new[]
            {
                new Pagamento { Id = Guid.NewGuid(), BoletoId = boletos[0].Id, Origem = "pix", ValorPago = 100m, DataPgto = now }
            };

            _mockBoletoRepository.Setup(r => r.Query()).Returns(boletos.AsQueryable());
            _mockUnidadeRepository.Setup(r => r.Query()).Returns(unidades.AsQueryable());
            _mockPagamentoRepository.Setup(r => r.Query()).Returns(pagamentos.AsQueryable());

            var dto = await _financeiroService.GetDashboardCobrancasAsync(condId);
            Assert.Equal(83.3m, dto.InadimplenciaPercentual);
            Assert.Equal(100m, dto.TotalPixMes);
            Assert.Equal(2, dto.TotalBoletosPendentes);
        }

        // ---- Despesa ----

        [Fact]
        public async Task CriarDespesaAsync_DeveAdicionarDespesaERetornarDto()
        {
            var input = new DespesaInputDto
            {
                Descricao = "Material de limpeza",
                Valor = 50m,
                DataCompetencia = DateTime.UtcNow,
                DataVencimento = DateTime.UtcNow.AddDays(5),
                Categoria = "Limpeza",
                Observacoes = "Teste"
            };

            Despesa? capturada = null;
            _mockDespesaRepository
                .Setup(r => r.AddAsync(It.IsAny<Despesa>(), default))
                .Callback<Despesa, CancellationToken>((d, _) => capturada = d)
                .Returns(Task.CompletedTask);
            _mockDespesaRepository.Setup(r => r.SaveChangesAsync(default)).ReturnsAsync(1);

            var dto = await _financeiroService.CriarDespesaAsync(Guid.NewGuid(), Guid.NewGuid(), input);

            Assert.NotNull(capturada);
            Assert.Equal(input.Descricao, capturada!.Descricao);
            Assert.Equal(input.Valor, capturada.Valor);
            Assert.Equal(dto.Id, capturada.Id);
            _mockDespesaRepository.Verify(r => r.AddAsync(It.IsAny<Despesa>(), default), Times.Once);
            _mockDespesaRepository.Verify(r => r.SaveChangesAsync(default), Times.Once);
        }

        [Fact]
        public async Task RemoverDespesaAsync_Inexistente_DeveRetornarFalse()
        {
            _mockDespesaRepository.Setup(r => r.Query()).Returns(new List<Despesa>().AsQueryable());
            var ok = await _financeiroService.RemoverDespesaAsync(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid());
            Assert.False(ok);
        }

        // ---- Balancete ----

        [Fact]
        public async Task GerarBalanceteAsync_DeveGerarBalanceteCorretamente()
        {
            var condId = Guid.NewGuid();
            var inicio = new DateTime(2025, 1, 1);
            var fim = new DateTime(2025, 1, 31);

            // Simula despesas
            var despesas = new[]
            {
                new Despesa { Id = Guid.NewGuid(), CondominioId = condId, Descricao = "Teste", Valor = 100m, DataCompetencia = new DateTime(2025,1,5) }
            }.AsQueryable();
            _mockDespesaRepository.Setup(r => r.Query()).Returns(despesas);

            // Simula boletos
            var boletos = new[]
            {
                new Boleto { Id = Guid.NewGuid(), UnidadeId = Guid.NewGuid(), Valor = 200m, DataVencimento = new DateTime(2025,1,10) }
            }.AsQueryable();
            var unidades = new[] { new Unidade { Id = boletos.First().UnidadeId, CondominioId = condId } }.AsQueryable();
            _mockBoletoRepository.Setup(r => r.Query()).Returns(boletos);
            _mockUnidadeRepository.Setup(r => r.Query()).Returns(unidades);

            var bal = await _financeiroService.GerarBalanceteAsync(condId, inicio, fim);

            Assert.NotNull(bal);
            Assert.Equal(200m, bal!.TotalReceitas);
            Assert.Equal(100m, bal.TotalDespesas);
            Assert.Equal(100m, bal.SaldoAtual);
        }

        // ---- Orçamento Anual ----

        [Fact]
        public async Task RegistrarOrcamentoAsync_ShouldAddItemsAndReturnDtos()
        {
            var condId = Guid.NewGuid();
            var categorias = new List<OrcamentoCategoriaInputDto>
            {
                new() { Categoria = "Manutencao", ValorPrevisto = 1000m },
                new() { Categoria = "Limpeza", ValorPrevisto = 500m }
            };
            var added = new List<OrcamentoAnual>();
            _mockOrcamentoRepository
                .Setup(r => r.AddAsync(It.IsAny<OrcamentoAnual>(), default))
                .Callback<OrcamentoAnual, CancellationToken>((o, _) => added.Add(o))
                .Returns(Task.CompletedTask);
            _mockOrcamentoRepository.Setup(r => r.SaveChangesAsync(default)).ReturnsAsync(1);

            var result = (await _financeiroService.RegistrarOrcamentoAsync(condId, 2025, categorias)).ToList();

            Assert.Equal(2, added.Count);
            Assert.Equal(2, result.Count);
            Assert.Contains(result, r => r.Categoria == "Manutencao" && r.ValorPrevisto == 1000m);
        }

        [Fact]
        public async Task CompararExecucaoOrcamentoAsync_ShouldReturnExecutedTotals()
        {
            var condId = Guid.NewGuid();
            var ano = 2025;

            var orcamentos = new List<OrcamentoAnual>
            {
                new() { Id = Guid.NewGuid(), CondominioId = condId, Ano = ano, Categoria = "Manutencao", ValorPrevisto = 1000m },
                new() { Id = Guid.NewGuid(), CondominioId = condId, Ano = ano, Categoria = "Limpeza", ValorPrevisto = 500m }
            }.AsQueryable();
            _mockOrcamentoRepository.Setup(r => r.Query()).Returns(orcamentos);

            var unidade = new Unidade { Id = Guid.NewGuid(), CondominioId = condId, Identificacao = "101" };
            _mockUnidadeRepository.Setup(r => r.Query()).Returns(new[] { unidade }.AsQueryable());

            var lancs = new List<LancamentoFinanceiro>
            {
                new() { Id = Guid.NewGuid(), UnidadeId = unidade.Id, Tipo = "debito", Valor = 600m, Data = new DateTime(ano,1,10), Descricao = "Manutencao" },
                new() { Id = Guid.NewGuid(), UnidadeId = unidade.Id, Tipo = "debito", Valor = 200m, Data = new DateTime(ano,2,5), Descricao = "Limpeza" }
            }.AsQueryable();
            _mockLancamentoRepository.Setup(r => r.Query()).Returns(lancs);

            var resultado = (await _financeiroService.CompararExecucaoOrcamentoAsync(condId, ano)).ToList();

            Assert.Equal(2, resultado.Count);
            var mant = resultado.First(r => r.Categoria == "Manutencao");
            Assert.Equal(1000m, mant.ValorPrevisto);
            Assert.Equal(600m, mant.ValorExecutado);
        }
    }
}
