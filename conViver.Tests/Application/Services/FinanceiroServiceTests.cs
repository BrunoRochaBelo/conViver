// FinanceiroServiceTests.cs
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
        private readonly Mock<INotificacaoService> _mockNotificacaoService;
        private readonly FinanceiroService _financeiroService;

        public FinanceiroServiceTests()
        {
            _mockBoletoRepository = new Mock<IRepository<Boleto>>();
            _mockUnidadeRepository = new Mock<IRepository<Unidade>>();
            _mockPagamentoRepository = new Mock<IRepository<Pagamento>>();
            _mockAcordoRepository = new Mock<IRepository<Acordo>>();
            _mockParcelaRepository = new Mock<IRepository<ParcelaAcordo>>();
            _mockNotificacaoService = new Mock<INotificacaoService>();

            _financeiroService = new FinanceiroService(
                _mockBoletoRepository.Object,
                _mockUnidadeRepository.Object,
                _mockPagamentoRepository.Object,
                _mockAcordoRepository.Object,
                _mockParcelaRepository.Object,
                _mockNotificacaoService.Object);
        }

        [Fact]
        public async Task CriarCobrancaAsync_ValidData_ShouldAddBoletoAndSaveChanges()
        {
            // Arrange
            var condominioId = Guid.NewGuid();
            var novaCobrancaDto = new NovaCobrancaDto
            {
                UnidadeId = Guid.NewGuid(),
                Valor = 100.50m,
                DataVencimento = DateTime.UtcNow.AddDays(10),
                Descricao = "Taxa Condominial"
            };

            _mockUnidadeRepository
                .Setup(r => r.GetByIdAsync(novaCobrancaDto.UnidadeId, default))
                .ReturnsAsync(new Unidade { Id = novaCobrancaDto.UnidadeId, CondominioId = condominioId, Identificacao = "101" });

            Boleto? capturedBoleto = null;
            _mockBoletoRepository
                .Setup(r => r.AddAsync(It.IsAny<Boleto>(), default))
                .Callback<Boleto, CancellationToken>((b, ct) => capturedBoleto = b)
                .Returns(Task.CompletedTask);

            _mockBoletoRepository
                .Setup(r => r.SaveChangesAsync(default))
                .ReturnsAsync(1);

            // Act
            var resultDto = await _financeiroService.CriarCobrancaAsync(condominioId, novaCobrancaDto);

            // Assert
            _mockBoletoRepository.Verify(r => r.AddAsync(It.IsAny<Boleto>(), default), Times.Once);
            _mockBoletoRepository.Verify(r => r.SaveChangesAsync(default), Times.Once);
            _mockNotificacaoService.Verify(n => n.SendAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Once);

            Assert.NotNull(capturedBoleto);
            Assert.Equal(novaCobrancaDto.UnidadeId, capturedBoleto!.UnidadeId);
            Assert.Equal(novaCobrancaDto.Valor, capturedBoleto.Valor);
            Assert.Equal(novaCobrancaDto.DataVencimento.Date, capturedBoleto.DataVencimento.Date);
            Assert.Equal(BoletoStatus.Gerado, capturedBoleto.Status);

            Assert.NotNull(resultDto);
            Assert.Equal(capturedBoleto.Id, resultDto.Id);
            Assert.Equal(capturedBoleto.UnidadeId, resultDto.UnidadeId);
            Assert.Equal(capturedBoleto.Valor, resultDto.Valor);
            Assert.Equal(capturedBoleto.DataVencimento, resultDto.DataVencimento);
        }

        [Fact]
        public async Task CriarCobrancaAsync_InvalidDataVencimento_ShouldThrowInvalidOperationException()
        {
            // Arrange
            var condominioId = Guid.NewGuid();
            var novaCobrancaDto = new NovaCobrancaDto
            {
                UnidadeId = Guid.NewGuid(),
                Valor = 100.50m,
                DataVencimento = DateTime.UtcNow.AddDays(1),
                Descricao = "Taxa Condominial"
            };

            // Act & Assert
            var exception = await Assert.ThrowsAsync<InvalidOperationException>(
                () => _financeiroService.CriarCobrancaAsync(condominioId, novaCobrancaDto)
            );

            Assert.Equal("Data de vencimento inválida. Deve ser pelo menos 3 dias no futuro.", exception.Message);
        }

        [Fact]
        public async Task ObterLinkSegundaViaAsync_ExistingAndEligibleBoleto_ShouldReturnDummyUrl()
        {
            // Arrange
            var cobrancaId = Guid.NewGuid();
            var mockBoleto = new Boleto
            {
                Id = cobrancaId,
                UnidadeId = Guid.NewGuid(),
                Valor = 100m,
                DataVencimento = DateTime.UtcNow.AddDays(5)
            };

            _mockBoletoRepository
                .Setup(r => r.GetByIdAsync(cobrancaId, default))
                .ReturnsAsync(mockBoleto);

            // Act
            var result = await _financeiroService.ObterLinkSegundaViaAsync(cobrancaId);

            // Assert
            Assert.NotNull(result);
            Assert.Equal($"https://example.com/segunda-via/{cobrancaId}/pdf", result);
        }

        [Fact]
        public async Task ObterLinkSegundaViaAsync_NonExistentBoleto_ShouldReturnNull()
        {
            // Arrange
            var cobrancaId = Guid.NewGuid();
            _mockBoletoRepository
                .Setup(r => r.GetByIdAsync(cobrancaId, default))
                .ReturnsAsync((Boleto?)null);

            // Act
            var result = await _financeiroService.ObterLinkSegundaViaAsync(cobrancaId);

            // Assert
            Assert.Null(result);
        }

        [Theory]
        [InlineData(BoletoStatus.Pago)]
        [InlineData(BoletoStatus.Cancelado)]
        public async Task ObterLinkSegundaViaAsync_IneligibleBoletoStatus_ShouldReturnNull(BoletoStatus status)
        {
            // Arrange
            var cobrancaId = Guid.NewGuid();
            var boleto = new Boleto { Id = cobrancaId };
            typeof(Boleto).GetProperty("Status")!.SetValue(boleto, status);

            _mockBoletoRepository
                .Setup(r => r.GetByIdAsync(cobrancaId, default))
                .ReturnsAsync(boleto);

            // Act
            var result = await _financeiroService.ObterLinkSegundaViaAsync(cobrancaId);

            // Assert
            Assert.Null(result);
        }

        [Fact]
        public async Task ListarCobrancasAsync_ShouldReturnFilteredByCondominioAndMappedCobrancas()
        {
            // Arrange
            var condominioAlvoId = Guid.NewGuid();
            var outroCondominioId = Guid.NewGuid();

            var unidades = new List<Unidade>
            {
                new Unidade { Id = Guid.NewGuid(), CondominioId = condominioAlvoId, Identificacao = "101" },
                new Unidade { Id = Guid.NewGuid(), CondominioId = condominioAlvoId, Identificacao = "102" },
                new Unidade { Id = Guid.NewGuid(), CondominioId = outroCondominioId, Identificacao = "A1" }
            };

            var boletos = new List<Boleto>
            {
                new Boleto { Id = Guid.NewGuid(), UnidadeId = unidades[0].Id, Valor = 100m, DataVencimento = DateTime.UtcNow.AddDays(10) },
                new Boleto { Id = Guid.NewGuid(), UnidadeId = unidades[1].Id, Valor = 200m, DataVencimento = DateTime.UtcNow.AddDays(10) },
                new Boleto { Id = Guid.NewGuid(), UnidadeId = unidades[2].Id, Valor = 300m, DataVencimento = DateTime.UtcNow.AddDays(10) }
            };
            typeof(Boleto).GetProperty("Status")!.SetValue(boletos[1], BoletoStatus.Pago);

            _mockUnidadeRepository.Setup(r => r.Query()).Returns(unidades.AsQueryable());
            _mockBoletoRepository.Setup(r => r.Query()).Returns(boletos.AsQueryable());

            // Act & Assert - no filter
            var resultSemFiltro = (await _financeiroService.ListarCobrancasAsync(condominioAlvoId, null)).ToList();
            Assert.Equal(2, resultSemFiltro.Count);
            Assert.Contains(resultSemFiltro, c => c.Id == boletos[0].Id && c.NomeSacado == $"Unidade {unidades[0].Identificacao}");
            Assert.Contains(resultSemFiltro, c => c.Id == boletos[1].Id && c.StatusCobranca == BoletoStatus.Pago.ToString());

            // Act & Assert - filter "Pago"
            var resultComFiltroPago = (await _financeiroService.ListarCobrancasAsync(condominioAlvoId, "Pago")).ToList();
            Assert.Single(resultComFiltroPago);
            Assert.Equal(boletos[1].Id, resultComFiltroPago[0].Id);

            // Act & Assert - filter "Pendente"
            var resultComFiltroPendente = (await _financeiroService.ListarCobrancasAsync(condominioAlvoId, "Pendente")).ToList();
            Assert.Single(resultComFiltroPendente);
            Assert.Equal(boletos[0].Id, resultComFiltroPendente[0].Id);

            // Act & Assert - no boletos for new condo
            var resultNenhumBoleto = (await _financeiroService.ListarCobrancasAsync(Guid.NewGuid(), null)).ToList();
            Assert.Empty(resultNenhumBoleto);
        }

        [Fact]
        public async Task GetCobrancaByIdAsync_ExistingBoleto_ShouldReturnMappedCobrancaDto()
        {
            // Arrange
            var boletoId = Guid.NewGuid();
            var unidadeId = Guid.NewGuid();
            var mockBoleto = new Boleto
            {
                Id = boletoId,
                UnidadeId = unidadeId,
                Valor = 150.75m,
                DataVencimento = DateTime.UtcNow.AddDays(15)
            };
            var mockUnidade = new Unidade { Id = unidadeId, CondominioId = Guid.NewGuid(), Identificacao = "202B" };

            _mockBoletoRepository.Setup(r => r.GetByIdAsync(boletoId, default)).ReturnsAsync(mockBoleto);
            _mockUnidadeRepository.Setup(r => r.GetByIdAsync(unidadeId, default)).ReturnsAsync(mockUnidade);

            // Act
            var result = await _financeiroService.GetCobrancaByIdAsync(boletoId);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(mockBoleto.Id, result!.Id);
            Assert.Equal(mockBoleto.UnidadeId, result.UnidadeId);
            Assert.Equal(mockBoleto.Valor, result.Valor);
            Assert.Equal(mockBoleto.DataVencimento, result.DataVencimento);
            Assert.Equal(mockBoleto.Status.ToString(), result.StatusCobranca);
            Assert.Equal($"Unidade {mockUnidade.Identificacao}", result.NomeSacado);
            Assert.Equal($"/api/v1/financeiro/cobrancas/{boletoId}/segunda-via", result.LinkSegundaVia);
        }

        [Fact]
        public async Task GetCobrancaByIdAsync_NonExistentBoleto_ShouldReturnNull()
        {
            // Arrange
            var boletoId = Guid.NewGuid();
            _mockBoletoRepository.Setup(r => r.GetByIdAsync(boletoId, default)).ReturnsAsync((Boleto?)null);

            // Act
            var result = await _financeiroService.GetCobrancaByIdAsync(boletoId);

            // Assert
            Assert.Null(result);
        }

        [Fact]
        public async Task GetCobrancaByIdAsync_BoletoExistsButUnidadeNotFound_ShouldReturnDtoWithFallbackNomeSacado()
        {
            // Arrange
            var boletoId = Guid.NewGuid();
            var unidadeId = Guid.NewGuid();
            var mockBoleto = new Boleto { Id = boletoId, UnidadeId = unidadeId, Valor = 100m };

            _mockBoletoRepository.Setup(r => r.GetByIdAsync(boletoId, default)).ReturnsAsync(mockBoleto);
            _mockUnidadeRepository.Setup(r => r.GetByIdAsync(unidadeId, default)).ReturnsAsync((Unidade?)null);

            // Act
            var result = await _financeiroService.GetCobrancaByIdAsync(boletoId);

            // Assert
            Assert.NotNull(result);
            Assert.Equal("Unidade não identificada", result!.NomeSacado);
        }

        [Fact]
        public async Task GerarCobrancasEmLoteAsync_ValidRequest_ShouldCreateAndSaveBoletos()
        {
            // Arrange
            var condominioId = Guid.NewGuid();
            var request = new GeracaoLoteRequestDto
            {
                Mes = DateTime.UtcNow.Month,
                Ano = DateTime.UtcNow.Year,
                DescricoesPadrao = new List<DescricaoPadraoDto>
                {
                    new DescricaoPadraoDto { Descricao = "Taxa Ordinária", Valor = 250.75m },
                    new DescricaoPadraoDto { Descricao = "Fundo Reserva", Valor = 25.25m }
                }
            };
            var today = DateTime.UtcNow;
            var due = new DateTime(request.Ano, request.Mes, 10);
            if (due < today.AddDays(3))
            {
                var next = today.AddMonths(1);
                request.Mes = next.Month;
                request.Ano = next.Year;
            }

            var unidades = new List<Unidade>
            {
                new Unidade { Id = Guid.NewGuid(), CondominioId = condominioId, Identificacao = "301" },
                new Unidade { Id = Guid.NewGuid(), CondominioId = condominioId, Identificacao = "302" }
            };
            _mockUnidadeRepository.Setup(r => r.Query()).Returns(unidades.AsQueryable());

            var captured = new List<Boleto>();
            _mockBoletoRepository
                .Setup(r => r.AddAsync(It.IsAny<Boleto>(), default))
                .Callback<Boleto, CancellationToken>((b, ct) => captured.Add(b));
            _mockBoletoRepository.Setup(r => r.SaveChangesAsync(default)).ReturnsAsync(unidades.Count);

            var expectedValor = request.DescricoesPadrao.Sum(d => d.Valor);
            var expectedVenc = new DateTime(request.Ano, request.Mes, 10);

            // Act
            var result = await _financeiroService.GerarCobrancasEmLoteAsync(condominioId, request);

            // Assert
            Assert.True(result.Sucesso);
            Assert.Equal($"{unidades.Count} boletos gerados com sucesso.", result.Mensagem);
            Assert.Equal(unidades.Count, captured.Count);
            foreach (var b in captured)
            {
                Assert.Equal(expectedValor, b.Valor);
                Assert.Equal(expectedVenc, b.DataVencimento);
                Assert.Contains(unidades, u => u.Id == b.UnidadeId);
            }
        }

        [Fact]
        public async Task GerarCobrancasEmLoteAsync_NoUnidadesFound_ShouldReturnFalseAndMessage()
        {
            // Arrange
            var condominioId = Guid.NewGuid();
            var request = new GeracaoLoteRequestDto
            {
                Mes = 1,
                Ano = DateTime.UtcNow.Year + 1,
                DescricoesPadrao = new List<DescricaoPadraoDto> { new DescricaoPadraoDto { Valor = 10 } }
            };
            _mockUnidadeRepository.Setup(r => r.Query()).Returns(new List<Unidade>().AsQueryable());

            // Act
            var result = await _financeiroService.GerarCobrancasEmLoteAsync(condominioId, request);

            // Assert
            Assert.False(result.Sucesso);
            Assert.Equal("Nenhuma unidade encontrada para o condomínio.", result.Mensagem);
        }

        [Theory]
        [InlineData(0, 2024, "Mês inválido.")]
        [InlineData(13, 2024, "Mês inválido.")]
        [InlineData(1, 2000, "Ano inválido.")]
        [InlineData(1, 2099, "Ano inválido.")]
        public async Task GerarCobrancasEmLoteAsync_InvalidRequestDateParams_ShouldReturnFalse(int mes, int ano, string expectedMessage)
        {
            // Arrange
            var condominioId = Guid.NewGuid();
            var request = new GeracaoLoteRequestDto
            {
                Mes = mes,
                Ano = ano,
                DescricoesPadrao = new List<DescricaoPadraoDto> { new DescricaoPadraoDto { Valor = 10 } }
            };
            _mockUnidadeRepository.Setup(r => r.Query()).Returns(new List<Unidade> { new Unidade { Id = Guid.NewGuid(), CondominioId = condominioId } }.AsQueryable());

            // Act
            var result = await _financeiroService.GerarCobrancasEmLoteAsync(condominioId, request);

            // Assert
            Assert.False(result.Sucesso);
            Assert.Equal(expectedMessage, result.Mensagem);
        }

        [Fact]
        public async Task GerarCobrancasEmLoteAsync_DueDateInPast_ShouldReturnFalse()
        {
            // Arrange
            var condominioId = Guid.NewGuid();
            var request = new GeracaoLoteRequestDto
            {
                Mes = DateTime.UtcNow.Month,
                Ano = DateTime.UtcNow.Year,
                DescricoesPadrao = new List<DescricaoPadraoDto> { new DescricaoPadraoDto { Valor = 10 } }
            };
            if (new DateTime(request.Ano, request.Mes, 10) >= DateTime.UtcNow.AddDays(3))
            {
                var twoMonthsAgo = DateTime.UtcNow.AddMonths(-2);
                request.Mes = twoMonthsAgo.Month;
                request.Ano = twoMonthsAgo.Year;
            }
            _mockUnidadeRepository.Setup(r => r.Query()).Returns(new List<Unidade> { new Unidade { Id = Guid.NewGuid(), CondominioId = condominioId } }.AsQueryable());

            // Act
            var result = await _financeiroService.GerarCobrancasEmLoteAsync(condominioId, request);

            // Assert
            Assert.False(result.Sucesso);
            Assert.Contains("Data de vencimento", result.Mensagem);
        }

        [Fact]
        public async Task GerarCobrancasEmLoteAsync_NoDescricoesPadrao_ShouldReturnSuccessNoBoletosGenerated()
        {
            // Arrange
            var condominioId = Guid.NewGuid();
            var request = new GeracaoLoteRequestDto
            {
                Mes = DateTime.UtcNow.AddMonths(1).Month,
                Ano = DateTime.UtcNow.AddMonths(1).Year,
                DescricoesPadrao = new List<DescricaoPadraoDto>()
            };
            _mockUnidadeRepository.Setup(r => r.Query()).Returns(new List<Unidade> { new Unidade { Id = Guid.NewGuid(), CondominioId = condominioId } }.AsQueryable());

            // Act
            var result = await _financeiroService.GerarCobrancasEmLoteAsync(condominioId, request);

            // Assert
            Assert.True(result.Sucesso);
            Assert.Equal("Nenhuma descrição de padrão de cobrança fornecida ou valor total é zero. Nenhum boleto foi gerado.", result.Mensagem);
        }

        [Fact]
        public async Task CancelarCobrancaAsync_ExistingAndEligibleBoleto_ShouldCancelAndUpdate()
        {
            // Arrange
            var cobrancaId = Guid.NewGuid();
            var boleto = new Boleto { Id = cobrancaId, UnidadeId = Guid.NewGuid(), Valor = 100m };

            _mockBoletoRepository.Setup(r => r.GetByIdAsync(cobrancaId, default)).ReturnsAsync(boleto);
            _mockBoletoRepository.Setup(r => r.UpdateAsync(boleto, default)).Returns(Task.CompletedTask);
            _mockBoletoRepository.Setup(r => r.SaveChangesAsync(default)).ReturnsAsync(1);

            // Act
            var result = await _financeiroService.CancelarCobrancaAsync(cobrancaId);

            // Assert
            Assert.True(result.Sucesso);
            Assert.Equal("Cobrança cancelada com sucesso.", result.Mensagem);
            Assert.Equal(BoletoStatus.Cancelado, boleto.Status);
        }

        [Fact]
        public async Task CancelarCobrancaAsync_NonExistentBoleto_ShouldReturnFalseAndMessage()
        {
            // Arrange
            var cobrancaId = Guid.NewGuid();
            _mockBoletoRepository.Setup(r => r.GetByIdAsync(cobrancaId, default)).ReturnsAsync((Boleto?)null);

            // Act
            var result = await _financeiroService.CancelarCobrancaAsync(cobrancaId);

            // Assert
            Assert.False(result.Sucesso);
            Assert.Equal("Cobrança não encontrada.", result.Mensagem);
        }

        [Fact]
        public async Task CancelarCobrancaAsync_BoletoIsPaid_ShouldReturnFalseAndErrorMessage()
        {
            // Arrange
            var cobrancaId = Guid.NewGuid();
            var boleto = new Boleto { Id = cobrancaId, UnidadeId = Guid.NewGuid(), Valor = 100m };
            typeof(Boleto).GetProperty("Status")!.SetValue(boleto, BoletoStatus.Pago);

            _mockBoletoRepository.Setup(r => r.GetByIdAsync(cobrancaId, default)).ReturnsAsync(boleto);

            // Act
            var result = await _financeiroService.CancelarCobrancaAsync(cobrancaId);

            // Assert
            Assert.False(result.Sucesso);
            Assert.Equal("Boleto pago não pode ser cancelado.", result.Mensagem);
        }

        [Fact]
        public async Task RegistrarPagamentoManualAsync_ShouldNotify()
        {
            // Arrange
            var boletoId = Guid.NewGuid();
            var boleto = new Boleto { Id = boletoId, UnidadeId = Guid.NewGuid(), Valor = 123m };
            var unidade = new Unidade { Id = boleto.UnidadeId, CondominioId = Guid.NewGuid(), Identificacao = "202" };

            _mockBoletoRepository.Setup(r => r.GetByIdAsync(boletoId, default)).ReturnsAsync(boleto);
            _mockUnidadeRepository.Setup(r => r.GetByIdAsync(boleto.UnidadeId, default)).ReturnsAsync(unidade);
            _mockBoletoRepository.Setup(r => r.UpdateAsync(boleto, default)).Returns(Task.CompletedTask);
            _mockBoletoRepository.Setup(r => r.SaveChangesAsync(default)).ReturnsAsync(1);
            _mockPagamentoRepository.Setup(r => r.AddAsync(It.IsAny<Pagamento>(), default)).Returns(Task.CompletedTask);
            _mockPagamentoRepository.Setup(r => r.SaveChangesAsync(default)).ReturnsAsync(1);

            // Act
            await _financeiroService.RegistrarPagamentoManualAsync(boletoId, 123m, DateTime.UtcNow);

            // Assert
            _mockNotificacaoService.Verify(n => n.SendAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Once);
        }

        [Fact]
        public async Task MarcarBoletosVencidosAsync_ShouldUpdateStatusAndNotify()
        {
            // Arrange
            var unidade = new Unidade { Id = Guid.NewGuid(), CondominioId = Guid.NewGuid(), Identificacao = "303" };
            var boleto = new Boleto { Id = Guid.NewGuid(), UnidadeId = unidade.Id, Valor = 50m, DataVencimento = DateTime.UtcNow.AddDays(-1) };

            _mockBoletoRepository.Setup(r => r.Query()).Returns(new List<Boleto> { boleto }.AsQueryable());
            _mockBoletoRepository.Setup(r => r.UpdateAsync(boleto, default)).Returns(Task.CompletedTask);
            _mockUnidadeRepository.Setup(r => r.GetByIdAsync(unidade.Id, default)).ReturnsAsync(unidade);
            _mockBoletoRepository.Setup(r => r.SaveChangesAsync(default)).ReturnsAsync(1);

            // Act
            var count = await _financeiroService.MarcarBoletosVencidosAsync();

            // Assert
            Assert.Equal(1, count);
            _mockNotificacaoService.Verify(n => n.SendAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Once);
            Assert.Equal(BoletoStatus.Vencido, boleto.Status);
        }

        [Fact]
        public async Task GetDashboardCobrancasAsync_NoData_ShouldReturnZeros()
        {
            // Arrange
            var condominioId = Guid.NewGuid();
            _mockBoletoRepository.Setup(r => r.Query()).Returns(new List<Boleto>().AsQueryable());
            _mockUnidadeRepository.Setup(r => r.Query()).Returns(new List<Unidade>().AsQueryable());
            _mockPagamentoRepository.Setup(r => r.Query()).Returns(new List<Pagamento>().AsQueryable());

            // Act
            var result = await _financeiroService.GetDashboardCobrancasAsync(condominioId);

            // Assert
            Assert.Equal(0m, result.InadimplenciaPercentual);
            Assert.Equal(0m, result.TotalPixMes);
            Assert.Equal(0, result.TotalBoletosPendentes);
        }

        [Fact]
        public async Task GetDashboardCobrancasAsync_WithData_ShouldCalculateMetrics()
        {
            // Arrange
            var condominioId = Guid.NewGuid();
            var outroCondominioId = Guid.NewGuid();

            var unidades = new List<Unidade>
            {
                new Unidade { Id = Guid.NewGuid(), CondominioId = condominioId },
                new Unidade { Id = Guid.NewGuid(), CondominioId = condominioId },
                new Unidade { Id = Guid.NewGuid(), CondominioId = outroCondominioId }
            };

            var hoje = DateTime.UtcNow;
            var boletos = new List<Boleto>
            {
                new Boleto { Id = Guid.NewGuid(), UnidadeId = unidades[0].Id, Valor = 100m, DataVencimento = new DateTime(hoje.Year, hoje.Month, 10) },
                new Boleto { Id = Guid.NewGuid(), UnidadeId = unidades[0].Id, Valor = 200m, DataVencimento = new DateTime(hoje.Year, hoje.Month, 15) },
                new Boleto { Id = Guid.NewGuid(), UnidadeId = unidades[1].Id, Valor = 300m, DataVencimento = new DateTime(hoje.Year, hoje.Month, 20) },
                new Boleto { Id = Guid.NewGuid(), UnidadeId = unidades[2].Id, Valor = 400m, DataVencimento = new DateTime(hoje.Year, hoje.Month, 10) }
            };
            typeof(Boleto).GetProperty("Status")!.SetValue(boletos[0], BoletoStatus.Pago);
            typeof(Boleto).GetProperty("Status")!.SetValue(boletos[2], BoletoStatus.Vencido);

            var pagamentos = new List<Pagamento>
            {
                new Pagamento { Id = Guid.NewGuid(), BoletoId = boletos[0].Id, Origem = "pix", ValorPago = 100m, DataPgto = hoje }
            };

            _mockBoletoRepository.Setup(r => r.Query()).Returns(boletos.AsQueryable());
            _mockUnidadeRepository.Setup(r => r.Query()).Returns(unidades.AsQueryable());
            _mockPagamentoRepository.Setup(r => r.Query()).Returns(pagamentos.AsQueryable());

            // Act
            var result = await _financeiroService.GetDashboardCobrancasAsync(condominioId);

            // Assert
            Assert.Equal(83.3m, result.InadimplenciaPercentual); // (500/600)*100 rounded
            Assert.Equal(100m, result.TotalPixMes);
            Assert.Equal(2, result.TotalBoletosPendentes);
        }

        [Fact]
        public async Task CriarDespesaAsync_ShouldReturnDespesaComStatusPendente()
        {
            // Arrange
            var condominioId = Guid.NewGuid();
            var usuarioId = Guid.NewGuid();
            var input = new DespesaInputDto
            {
                Descricao = "Limpeza",
                Valor = 50m,
                DataCompetencia = DateTime.UtcNow.Date,
                DataVencimento = DateTime.UtcNow.Date.AddDays(5),
                Categoria = "Servicos",
                Observacoes = "Teste"
            };

            // Act
            var result = await _financeiroService.CriarDespesaAsync(condominioId, usuarioId, input);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(input.Descricao, result.Descricao);
            Assert.Equal(input.Valor, result.Valor);
            Assert.Equal(input.DataCompetencia, result.DataCompetencia);
            Assert.Equal(input.DataVencimento, result.DataVencimento);
            Assert.Equal(input.Categoria, result.Categoria);
            Assert.Equal(input.Observacoes, result.Observacoes);
            Assert.Equal(usuarioId, result.UsuarioRegistroId);
            Assert.Equal("Pendente", result.Status);
            Assert.NotEqual(Guid.Empty, result.Id);
        }

        [Fact]
        public async Task ListarDespesasAsync_ShouldReturnListaVazia()
        {
            // Act
            var result = await _financeiroService.ListarDespesasAsync(Guid.NewGuid(), null, null);

            // Assert
            Assert.Empty(result);
        }

        [Fact]
        public async Task GerarBalanceteAsync_ShouldRetornarNull()
        {
            // Act
            var result = await _financeiroService.GerarBalanceteAsync(Guid.NewGuid(), DateTime.UtcNow.AddMonths(-1), DateTime.UtcNow);

            // Assert
            Assert.Null(result);
        }

        [Fact]
        public async Task CriarAcordoAsync_DevePersistirEAtribuirParcelas()
        {
            // Arrange
            var unidadeId = Guid.NewGuid();
            decimal entrada = 100m;
            short parcelas = 2;

            Acordo? acordoCapturado = null;
            var parcelasCapturadas = new List<ParcelaAcordo>();

            _mockAcordoRepository
                .Setup(r => r.AddAsync(It.IsAny<Acordo>(), default))
                .Callback<Acordo, CancellationToken>((a, ct) => acordoCapturado = a)
                .Returns(Task.CompletedTask);

            _mockParcelaRepository
                .Setup(r => r.AddAsync(It.IsAny<ParcelaAcordo>(), default))
                .Callback<ParcelaAcordo, CancellationToken>((p, ct) => parcelasCapturadas.Add(p))
                .Returns(Task.CompletedTask);

            _mockAcordoRepository.Setup(r => r.SaveChangesAsync(default)).ReturnsAsync(1);
            _mockParcelaRepository.Setup(r => r.SaveChangesAsync(default)).ReturnsAsync(1);

            // Act
            var dto = await _financeiroService.CriarAcordoAsync(unidadeId, entrada, parcelas);

            // Assert
            _mockAcordoRepository.Verify(r => r.AddAsync(It.IsAny<Acordo>(), default), Times.Once);
            _mockParcelaRepository.Verify(r => r.AddAsync(It.IsAny<ParcelaAcordo>(), default), Times.Exactly(parcelas));
            _mockAcordoRepository.Verify(r => r.SaveChangesAsync(default), Times.Once);
            _mockParcelaRepository.Verify(r => r.SaveChangesAsync(default), Times.Once);

            Assert.NotNull(acordoCapturado);
            Assert.Equal(unidadeId, acordoCapturado!.UnidadeId);
            Assert.Equal(entrada + 100m * parcelas, acordoCapturado.ValorTotal);
            Assert.Equal(parcelas, acordoCapturado.Parcelas);

            Assert.Equal(parcelas, parcelasCapturadas.Count);
            for (int i = 0; i < parcelas; i++)
            {
                Assert.Equal((short)(i + 1), parcelasCapturadas[i].Numero);
                Assert.Equal(100m, parcelasCapturadas[i].Valor);
            }

            Assert.Equal(acordoCapturado.Id, dto.Id);
            Assert.Equal(acordoCapturado.ValorTotal, dto.ValorTotal);
            Assert.Equal(parcelas, (short)dto.Parcelas.Count);
        }

        [Fact]
        public async Task RegistrarPagamentoManualAsync_BoletoExistente_DeveRegistrarPagamento()
        {
            // Arrange
            var boletoId = Guid.NewGuid();
            var boleto = new Boleto { Id = boletoId, UnidadeId = Guid.NewGuid(), Valor = 120m };

            _mockBoletoRepository.Setup(r => r.GetByIdAsync(boletoId, default)).ReturnsAsync(boleto);
            _mockBoletoRepository.Setup(r => r.UpdateAsync(boleto, default)).Returns(Task.CompletedTask);
            _mockBoletoRepository.Setup(r => r.SaveChangesAsync(default)).ReturnsAsync(1);

            Pagamento? pagamentoCapturado = null;
            _mockPagamentoRepository
                .Setup(r => r.AddAsync(It.IsAny<Pagamento>(), default))
                .Callback<Pagamento, CancellationToken>((p, ct) => pagamentoCapturado = p)
                .Returns(Task.CompletedTask);
            _mockPagamentoRepository.Setup(r => r.SaveChangesAsync(default)).ReturnsAsync(1);

            var valorPago = 50m;
            var dataPgto = DateTime.UtcNow;

            // Act
            var dto = await _financeiroService.RegistrarPagamentoManualAsync(boletoId, valorPago, dataPgto);

            // Assert
            _mockBoletoRepository.Verify(r => r.UpdateAsync(boleto, default), Times.Once);
            _mockPagamentoRepository.Verify(r => r.AddAsync(It.IsAny<Pagamento>(), default), Times.Once);
            _mockBoletoRepository.Verify(r => r.SaveChangesAsync(default), Times.Once);
            _mockPagamentoRepository.Verify(r => r.SaveChangesAsync(default), Times.Once);

            Assert.Equal(BoletoStatus.Pago, boleto.Status);
            Assert.NotNull(dto);
            Assert.Equal(pagamentoCapturado!.Id, dto!.PagamentoId);
            Assert.Equal("Confirmado", dto.Status);
        }

        [Fact]
        public async Task RegistrarPagamentoManualAsync_BoletoInexistente_DeveRetornarNull()
        {
            // Arrange
            _mockBoletoRepository.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), default)).ReturnsAsync((Boleto?)null);

            // Act
            var dto = await _financeiroService.RegistrarPagamentoManualAsync(Guid.NewGuid(), 10m, DateTime.UtcNow);

            // Assert
            Assert.Null(dto);
            _mockPagamentoRepository.Verify(r => r.AddAsync(It.IsAny<Pagamento>(), default), Times.Never);
            _mockBoletoRepository.Verify(r => r.UpdateAsync(It.IsAny<Boleto>(), default), Times.Never);
        }
    }
}
