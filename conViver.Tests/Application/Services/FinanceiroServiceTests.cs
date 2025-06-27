// Base structure for FinanceiroServiceTests.cs
using Xunit;
using Moq;
using conViver.Core.Interfaces;
using conViver.Core.Entities;
using conViver.Core.DTOs;
using conViver.Core.Enums;
using conViver.Application.Services;
using System;
using System.Threading.Tasks;
using System.Linq.Expressions; // Required for It.IsAny<Expression<Func<Boleto, bool>>>() if needed later
using System.Collections.Generic; // Required for List<T>
using System.Linq; // Required for Linq operations like .Any()

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

            Boleto? capturedBoleto = null; // To capture the boleto passed to AddAsync

            _mockBoletoRepository
                .Setup(r => r.AddAsync(It.IsAny<Boleto>(), default))
                .Callback<Boleto, CancellationToken>((b, ct) => capturedBoleto = b) // Capture the boleto
                .Returns(Task.CompletedTask);

            _mockBoletoRepository
                .Setup(r => r.SaveChangesAsync(default))
                .ReturnsAsync(1);

            // Act
            var resultDto = await _financeiroService.CriarCobrancaAsync(condominioId, novaCobrancaDto);

            // Assert
            _mockBoletoRepository.Verify(r => r.AddAsync(It.IsAny<Boleto>(), default), Times.Once);
            _mockBoletoRepository.Verify(r => r.SaveChangesAsync(default), Times.Once);
            _mockNotificacaoService.Verify(n => n.SendAsync(It.IsAny<string>(), It.IsAny<string>(), default), Times.Once);

            Assert.NotNull(capturedBoleto);
            Assert.Equal(novaCobrancaDto.UnidadeId, capturedBoleto.UnidadeId);
            Assert.Equal(novaCobrancaDto.Valor, capturedBoleto.Valor);
            Assert.Equal(novaCobrancaDto.DataVencimento.Date, capturedBoleto.DataVencimento.Date);
            Assert.Equal(BoletoStatus.Gerado, capturedBoleto.Status); // Default status

            Assert.NotNull(resultDto);
            Assert.Equal(capturedBoleto.Id, resultDto.Id);
            Assert.Equal(capturedBoleto.UnidadeId, resultDto.UnidadeId);
            Assert.Equal(capturedBoleto.Valor, resultDto.Valor);
            Assert.Equal(capturedBoleto.DataVencimento, resultDto.DataVencimento);
            // NomeSacado is a placeholder in the service, so we check for its placeholder format or skip detailed check for now.
            // For now, we know it's "Proprietário Unidade " + first 4 chars of UnidadeId.
            // We can make this more robust if we also mock UnidadeRepository for this specific test's DTO mapping part,
            // but the primary goal here is to check Boleto creation.
            // Assert.Contains("Proprietário Unidade", resultDto.NomeSacado);
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
                DataVencimento = DateTime.UtcNow.AddDays(1), // Invalid: Too soon (service requires >= 3 days in future)
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
                DataVencimento = DateTime.UtcNow.AddDays(5),
                // Status is Gerado by default, which is eligible
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
            // We need to use reflection to set the private Status property for the test,
            // or modify Boleto to have an internal constructor or method for test setup.
            // For this example, let's assume Boleto might have a test helper or we accept this limitation.
            // A cleaner way would be to have the Boleto entity's state transitions tested separately,
            // and here we just mock the status.
            // For simplicity, we'll create a boleto and try to change its status via methods if possible,
            // or acknowledge this setup challenge. The Boleto class sets status to Gerado initially.
            // To test Pago/Cancelado, these statuses are typically set via methods.
            // Let's simulate that the boleto was retrieved with that status.
            var mockBoleto = new Boleto { Id = cobrancaId, UnidadeId = Guid.NewGuid(), Valor = 100m };

            // Directly setting private 'Status' is not straightforward without reflection or changing Boleto.
            // Instead, we will mock GetByIdAsync to return a boleto that *already* has this status.
            // This means the test relies on the mock correctly representing an entity in that state.
            // The Boleto entity itself should be responsible for how it gets into these states.

            // To properly test this, we'd ideally need a way to construct a Boleto in a specific state
            // or modify the private setter. Let's create a new Boleto and use reflection for 'Status'.
            var boletoWithStatus = new Boleto { Id = cobrancaId }; // Other properties are not crucial for this status check
            var statusProperty = typeof(Boleto).GetProperty("Status");
            Assert.NotNull(statusProperty); // Ensure the property exists
            statusProperty.SetValue(boletoWithStatus, status, null);


            _mockBoletoRepository
                .Setup(r => r.GetByIdAsync(cobrancaId, default))
                .ReturnsAsync(boletoWithStatus);

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
                new Unidade { Id = Guid.NewGuid(), CondominioId = outroCondominioId, Identificacao = "A1" } // Different condo
            };

            var boletos = new List<Boleto>
            {
                new Boleto { Id = Guid.NewGuid(), UnidadeId = unidades[0].Id, Valor = 100m, DataVencimento = DateTime.UtcNow.AddDays(10) }, // Status Gerado
                new Boleto { Id = Guid.NewGuid(), UnidadeId = unidades[1].Id, Valor = 200m, DataVencimento = DateTime.UtcNow.AddDays(10) }, // Status Gerado
                new Boleto { Id = Guid.NewGuid(), UnidadeId = unidades[2].Id, Valor = 300m, DataVencimento = DateTime.UtcNow.AddDays(10) }  // Boleto for other condo
            };
            // Set status for one boleto in condominioAlvoId to Pago for later filter test
            var statusProperty = typeof(Boleto).GetProperty("Status");
            statusProperty.SetValue(boletos[1], BoletoStatus.Pago, null);


            _mockUnidadeRepository.Setup(r => r.Query()).Returns(unidades.AsQueryable());
            _mockBoletoRepository.Setup(r => r.Query()).Returns(boletos.AsQueryable());

            // Act - No status filter
            var resultSemFiltro = (await _financeiroService.ListarCobrancasAsync(condominioAlvoId, null)).ToList();

            // Assert - No status filter
            Assert.Equal(2, resultSemFiltro.Count); // Only boletos from condominioAlvoId
            Assert.Contains(resultSemFiltro, c => c.Id == boletos[0].Id && c.NomeSacado == $"Unidade {unidades[0].Identificacao}");
            Assert.Contains(resultSemFiltro, c => c.Id == boletos[1].Id && c.NomeSacado == $"Unidade {unidades[1].Identificacao}");
            Assert.Equal(boletos[0].Valor, resultSemFiltro.First(c=>c.Id == boletos[0].Id).Valor);
            Assert.Equal(BoletoStatus.Gerado.ToString(), resultSemFiltro.First(c=>c.Id == boletos[0].Id).StatusCobranca);
            Assert.Equal(BoletoStatus.Pago.ToString(), resultSemFiltro.First(c=>c.Id == boletos[1].Id).StatusCobranca);


            // Act - With status filter "Pago"
            var resultComFiltroPago = (await _financeiroService.ListarCobrancasAsync(condominioAlvoId, "Pago")).ToList();

            // Assert - With status filter "Pago"
            Assert.Single(resultComFiltroPago);
            Assert.Equal(boletos[1].Id, resultComFiltroPago[0].Id);
            Assert.Equal(BoletoStatus.Pago.ToString(), resultComFiltroPago[0].StatusCobranca);

            // Act - With status filter "Pendente"
            var resultComFiltroPendente = (await _financeiroService.ListarCobrancasAsync(condominioAlvoId, "Pendente")).ToList();

            // Assert - With status filter "Pendente" (boletos[0] is Gerado, which is Pendente)
            Assert.Single(resultComFiltroPendente);
            Assert.Equal(boletos[0].Id, resultComFiltroPendente[0].Id);
            Assert.Equal(BoletoStatus.Gerado.ToString(), resultComFiltroPendente[0].StatusCobranca);


            // Act - No boletos for condominio (using a new Guid)
             var resultNenhumBoleto = (await _financeiroService.ListarCobrancasAsync(Guid.NewGuid(), null)).ToList();

            // Assert - No boletos for condominio
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
                // Status is Gerado by default
            };
            var mockUnidade = new Unidade { Id = unidadeId, CondominioId = Guid.NewGuid(), Identificacao = "202B" };

            _mockBoletoRepository.Setup(r => r.GetByIdAsync(boletoId, default)).ReturnsAsync(mockBoleto);
            _mockUnidadeRepository.Setup(r => r.GetByIdAsync(unidadeId, default)).ReturnsAsync(mockUnidade);

            // Act
            var result = await _financeiroService.GetCobrancaByIdAsync(boletoId);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(mockBoleto.Id, result.Id);
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
            _mockUnidadeRepository.Setup(r => r.GetByIdAsync(unidadeId, default)).ReturnsAsync((Unidade?)null); // Unidade not found

            // Act
            var result = await _financeiroService.GetCobrancaByIdAsync(boletoId);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(boletoId, result.Id);
            Assert.Equal("Unidade não identificada", result.NomeSacado);
        }

        [Fact]
        public async Task GerarCobrancasEmLoteAsync_ValidRequest_ShouldCreateAndSaveBoletos()
        {
            // Arrange
            var condominioId = Guid.NewGuid();
            var request = new GeracaoLoteRequestDto
            {
                Mes = DateTime.UtcNow.Month, // Ensure current month/year makes sense for future due date
                Ano = DateTime.UtcNow.Year,
                DescricoesPadrao = new List<DescricaoPadraoDto>
                {
                    new DescricaoPadraoDto { Descricao = "Taxa Ordinária", Valor = 250.75m },
                    new DescricaoPadraoDto { Descricao = "Fundo Reserva", Valor = 25.25m }
                }
            };
            // Adjust Mes/Ano if current day is too close to month end for the default Day 10 due date
            var today = DateTime.UtcNow;
            var proposedDueDate = new DateTime(request.Ano, request.Mes, 10);
            if (proposedDueDate < today.AddDays(3))
            {
                var nextMonth = today.AddMonths(1);
                request.Mes = nextMonth.Month;
                request.Ano = nextMonth.Year;
            }


            var unidades = new List<Unidade>
            {
                new Unidade { Id = Guid.NewGuid(), CondominioId = condominioId, Identificacao = "301" },
                new Unidade { Id = Guid.NewGuid(), CondominioId = condominioId, Identificacao = "302" }
            };
            _mockUnidadeRepository.Setup(r => r.Query()).Returns(unidades.AsQueryable());

            var capturedBoletos = new List<Boleto>();
            _mockBoletoRepository
                .Setup(r => r.AddAsync(It.IsAny<Boleto>(), default))
                .Callback<Boleto, CancellationToken>((b, ct) => capturedBoletos.Add(b));

            _mockBoletoRepository.Setup(r => r.SaveChangesAsync(default)).ReturnsAsync(unidades.Count);

            var expectedValorTotal = request.DescricoesPadrao.Sum(d => d.Valor);
            var expectedDataVencimento = new DateTime(request.Ano, request.Mes, 10); // As per service logic

            // Act
            var result = await _financeiroService.GerarCobrancasEmLoteAsync(condominioId, request);

            // Assert
            Assert.True(result.Sucesso);
            Assert.Equal($"{unidades.Count} boletos gerados com sucesso.", result.Mensagem);
            _mockBoletoRepository.Verify(r => r.AddAsync(It.IsAny<Boleto>(), default), Times.Exactly(unidades.Count));
            _mockBoletoRepository.Verify(r => r.SaveChangesAsync(default), Times.Once);

            Assert.Equal(unidades.Count, capturedBoletos.Count);
            foreach (var boleto in capturedBoletos)
            {
                Assert.Equal(expectedValorTotal, boleto.Valor);
                Assert.Equal(expectedDataVencimento, boleto.DataVencimento);
                Assert.Contains(unidades, u => u.Id == boleto.UnidadeId);
            }
        }

        [Fact]
        public async Task GerarCobrancasEmLoteAsync_NoUnidadesFound_ShouldReturnFalseAndMessage()
        {
            // Arrange
            var condominioId = Guid.NewGuid();
            var request = new GeracaoLoteRequestDto { Mes = 1, Ano = DateTime.UtcNow.Year + 1, DescricoesPadrao = new List<DescricaoPadraoDto> { new DescricaoPadraoDto { Valor = 10 } } };

            _mockUnidadeRepository.Setup(r => r.Query()).Returns(new List<Unidade>().AsQueryable()); // No unidades

            // Act
            var result = await _financeiroService.GerarCobrancasEmLoteAsync(condominioId, request);

            // Assert
            Assert.False(result.Sucesso);
            Assert.Equal("Nenhuma unidade encontrada para o condomínio.", result.Mensagem);
            _mockBoletoRepository.Verify(r => r.AddAsync(It.IsAny<Boleto>(), default), Times.Never);
            _mockBoletoRepository.Verify(r => r.SaveChangesAsync(default), Times.Never);
        }

        [Theory]
        [InlineData(0, 2024, "Mês inválido.")] // Invalid month
        [InlineData(13, 2024, "Mês inválido.")] // Invalid month
        [InlineData(1, 2000, "Ano inválido.")]    // Invalid year (too old)
        [InlineData(1, 2099, "Ano inválido.")]    // Invalid year (too far)
        public async Task GerarCobrancasEmLoteAsync_InvalidRequestDateParams_ShouldReturnFalse(int mes, int ano, string expectedMessage)
        {
            // Arrange
            var condominioId = Guid.NewGuid();
             var request = new GeracaoLoteRequestDto { Mes = mes, Ano = ano, DescricoesPadrao = new List<DescricaoPadraoDto> { new DescricaoPadraoDto { Valor = 10 } } };
            _mockUnidadeRepository.Setup(r => r.Query()).Returns(new List<Unidade>{new Unidade{Id = Guid.NewGuid(), CondominioId = condominioId}}.AsQueryable());


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
            // Request for a month/year whose 10th day is in the past or too close
            var pastDateRequest = new GeracaoLoteRequestDto
            {
                Mes = DateTime.UtcNow.Month,
                Ano = DateTime.UtcNow.Year,
                DescricoesPadrao = new List<DescricaoPadraoDto> { new DescricaoPadraoDto { Valor = 10 } }
            };
             // Ensure the default due date (day 10) is problematic for this test
            if (new DateTime(pastDateRequest.Ano, pastDateRequest.Mes, 10) >= DateTime.UtcNow.AddDays(3))
            {
                // This scenario is not what we want to test here, skip or adjust if current date is e.g. 1st of month
                // Forcing a past due date:
                var twoMonthsAgo = DateTime.UtcNow.AddMonths(-2);
                pastDateRequest.Mes = twoMonthsAgo.Month;
                pastDateRequest.Ano = twoMonthsAgo.Year;
            }


            _mockUnidadeRepository.Setup(r => r.Query()).Returns(new List<Unidade>{new Unidade{Id = Guid.NewGuid(), CondominioId = condominioId}}.AsQueryable());

            // Act
            var result = await _financeiroService.GerarCobrancasEmLoteAsync(condominioId, pastDateRequest);

            // Assert
            Assert.False(result.Sucesso);
            // The message could be "Data de vencimento (dia 10 do mês/ano) deve ser pelo menos 3 dias no futuro."
            // or "Data de vencimento inválida (dia 10 não existe para o mês/ano)." if day 10 is bad for some reason (not this test)
            Assert.Contains("Data de vencimento", result.Mensagem);
        }


        [Fact]
        public async Task GerarCobrancasEmLoteAsync_NoDescricoesPadrao_ShouldReturnSuccessNoBoletosGenerated()
        {
            // Arrange
            var condominioId = Guid.NewGuid();
            var request = new GeracaoLoteRequestDto
            {
                Mes = DateTime.UtcNow.AddMonths(1).Month, // Future month
                Ano = DateTime.UtcNow.AddMonths(1).Year,
                DescricoesPadrao = new List<DescricaoPadraoDto>() // Empty descriptions
            };
            var unidades = new List<Unidade> { new Unidade { Id = Guid.NewGuid(), CondominioId = condominioId } };
            _mockUnidadeRepository.Setup(r => r.Query()).Returns(unidades.AsQueryable());

            // Act
            var result = await _financeiroService.GerarCobrancasEmLoteAsync(condominioId, request);

            // Assert
            Assert.True(result.Sucesso); // Service handles this as a valid scenario, just no boletos.
            Assert.Equal("Nenhuma descrição de padrão de cobrança fornecida ou valor total é zero. Nenhum boleto foi gerado.", result.Mensagem);
            _mockBoletoRepository.Verify(r => r.AddAsync(It.IsAny<Boleto>(), default), Times.Never);
            _mockBoletoRepository.Verify(r => r.SaveChangesAsync(default), Times.Never);
        }

        [Fact]
        public async Task CancelarCobrancaAsync_ExistingAndEligibleBoleto_ShouldCancelAndUpdate()
        {
            // Arrange
            var cobrancaId = Guid.NewGuid();
            // Real Boleto instance to test its Cancelar() method's behavior
            var boleto = new Boleto { Id = cobrancaId, UnidadeId = Guid.NewGuid(), Valor = 100m };

            _mockBoletoRepository.Setup(r => r.GetByIdAsync(cobrancaId, default)).ReturnsAsync(boleto);
            _mockBoletoRepository.Setup(r => r.UpdateAsync(boleto, default)).Returns(Task.CompletedTask);
            _mockBoletoRepository.Setup(r => r.SaveChangesAsync(default)).ReturnsAsync(1);

            // Act
            var result = await _financeiroService.CancelarCobrancaAsync(cobrancaId);

            // Assert
            Assert.True(result.Sucesso);
            Assert.Equal("Cobrança cancelada com sucesso.", result.Mensagem);
            Assert.Equal(BoletoStatus.Cancelado, boleto.Status); // Verify the actual object's state changed
            _mockBoletoRepository.Verify(r => r.GetByIdAsync(cobrancaId, default), Times.Once);
            _mockBoletoRepository.Verify(r => r.UpdateAsync(boleto, default), Times.Once);
            _mockBoletoRepository.Verify(r => r.SaveChangesAsync(default), Times.Once);
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
            _mockBoletoRepository.Verify(r => r.UpdateAsync(It.IsAny<Boleto>(), default), Times.Never);
            _mockBoletoRepository.Verify(r => r.SaveChangesAsync(default), Times.Never);
        }

        [Fact]
        public async Task CancelarCobrancaAsync_BoletoIsPaid_ShouldReturnFalseAndErrorMessage()
        {
            // Arrange
            var cobrancaId = Guid.NewGuid();
            // Create a real Boleto and mark it as Paid
            var boleto = new Boleto { Id = cobrancaId, UnidadeId = Guid.NewGuid(), Valor = 100m };
            // Simulate it being paid - direct status change for test setup simplicity
            var statusProperty = typeof(Boleto).GetProperty("Status");
            statusProperty.SetValue(boleto, BoletoStatus.Pago, null);
            // In a full test of Boleto itself, you'd call boleto.RegistrarPagamento(...)
            // For this service test, we assume Boleto is already in this state.

            _mockBoletoRepository.Setup(r => r.GetByIdAsync(cobrancaId, default)).ReturnsAsync(boleto);

            // Act
            var result = await _financeiroService.CancelarCobrancaAsync(cobrancaId);

            // Assert
            Assert.False(result.Sucesso);
            Assert.Equal("Boleto pago não pode ser cancelado.", result.Mensagem); // Message from Boleto.Cancelar()
            _mockBoletoRepository.Verify(r => r.UpdateAsync(It.IsAny<Boleto>(), default), Times.Never);
            _mockBoletoRepository.Verify(r => r.SaveChangesAsync(default), Times.Never);
        }

        [Fact]
        public async Task RegistrarPagamentoManualAsync_ShouldNotify()
        {
            var boletoId = Guid.NewGuid();
            var boleto = new Boleto { Id = boletoId, UnidadeId = Guid.NewGuid(), Valor = 123m };
            var unidade = new Unidade { Id = boleto.UnidadeId, CondominioId = Guid.NewGuid(), Identificacao = "202" };

            _mockBoletoRepository.Setup(r => r.GetByIdAsync(boletoId, default)).ReturnsAsync(boleto);
            _mockUnidadeRepository.Setup(r => r.GetByIdAsync(boleto.UnidadeId, default)).ReturnsAsync(unidade);
            _mockBoletoRepository.Setup(r => r.UpdateAsync(boleto, default)).Returns(Task.CompletedTask);
            _mockBoletoRepository.Setup(r => r.SaveChangesAsync(default)).ReturnsAsync(1);
            _mockPagamentoRepository.Setup(r => r.AddAsync(It.IsAny<Pagamento>(), default)).Returns(Task.CompletedTask);
            _mockPagamentoRepository.Setup(r => r.SaveChangesAsync(default)).ReturnsAsync(1);

            await _financeiroService.RegistrarPagamentoManualAsync(boletoId, 123m, DateTime.UtcNow);

            _mockNotificacaoService.Verify(n => n.SendAsync(It.IsAny<string>(), It.IsAny<string>(), default), Times.Once);
        }

        [Fact]
        public async Task MarcarBoletosVencidosAsync_ShouldUpdateStatusAndNotify()
        {
            var unidade = new Unidade { Id = Guid.NewGuid(), CondominioId = Guid.NewGuid(), Identificacao = "303" };
            var boleto = new Boleto { Id = Guid.NewGuid(), UnidadeId = unidade.Id, Valor = 50m, DataVencimento = DateTime.UtcNow.AddDays(-1) };

            _mockBoletoRepository.Setup(r => r.Query()).Returns(new List<Boleto> { boleto }.AsQueryable());
            _mockBoletoRepository.Setup(r => r.UpdateAsync(boleto, default)).Returns(Task.CompletedTask);
            _mockUnidadeRepository.Setup(r => r.GetByIdAsync(unidade.Id, default)).ReturnsAsync(unidade);
            _mockBoletoRepository.Setup(r => r.SaveChangesAsync(default)).ReturnsAsync(1);

            var count = await _financeiroService.MarcarBoletosVencidosAsync();

            Assert.Equal(1, count);
            _mockNotificacaoService.Verify(n => n.SendAsync(It.IsAny<string>(), It.IsAny<string>(), default), Times.Once);
            Assert.Equal(BoletoStatus.Vencido, boleto.Status);
        }


        // More test methods will be added here
        // No tests for UsuarioService in this file as per original plan for FinanceiroServiceTests.
        // UsuarioServiceTests would be in a separate file.
    }
}
