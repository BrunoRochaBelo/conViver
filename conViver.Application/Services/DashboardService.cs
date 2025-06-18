using conViver.Core.DTOs;
// using conViver.Core.Interfaces; // Para repositórios futuros
// using conViver.Core.Entities; // Para entidades futuras
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace conViver.Application.Services;

public class DashboardService
{
    // Injete repositórios e outros serviços aqui quando for buscar dados reais
    // Ex: private readonly IRepository<Condominio> _condominioRepo;

    public DashboardService(/* Dependências aqui */)
    {
    }

    public Task<DashboardGeralDto> GetDashboardGeralAsync(Guid condominioId /* ou userId */)
    {
        // TODO: Implementar lógica para buscar dados reais dos repositórios/serviços
        // Por enquanto, retorna dados mockados para permitir o desenvolvimento do front-end.

        var mockMetrics = new DashboardMetricsDto
        {
            InadimplenciaPercentual = 12.5m,
            InadimplenciaValorTotal = 1250.75m,
            SaldoDisponivel = 7530.40m,
            ProximasDespesas = new List<ProximaDespesaDto>
            {
                new() { Id = Guid.NewGuid(), Descricao = "Conta de Luz", Valor = 350.00m, DataVencimento = DateTime.UtcNow.AddDays(5) },
                new() { Id = Guid.NewGuid(), Descricao = "Manutenção Elevador", Valor = 800.00m, DataVencimento = DateTime.UtcNow.AddDays(10) }
            }
        };

        var mockAlerts = new List<AlertaDto>
        {
            new() { Id = Guid.NewGuid(), Titulo = "Contrato de Seguro Vencendo", Mensagem = "O contrato de seguro do condomínio vence em 15 dias.", Criticidade = "alta", DataCriacao = DateTime.UtcNow.AddDays(-1) },
            new() { Id = Guid.NewGuid(), Titulo = "Caixa d'água precisa de limpeza", Mensagem = "Agendar limpeza da caixa d'água.", Criticidade = "normal", DataCriacao = DateTime.UtcNow.AddDays(-3) }
        };

        var mockAtividades = new List<AtividadeRecenteDto>
        {
            new() { Id = Guid.NewGuid(), Tipo = "Chamado", Descricao = "Vazamento na unidade 101", DataOcorrencia = DateTime.UtcNow.AddHours(-5) },
            new() { Id = Guid.NewGuid(), Tipo = "Aviso", Descricao = "Manutenção da piscina agendada para 25/07", DataOcorrencia = DateTime.UtcNow.AddHours(-20) },
            new() { Id = Guid.NewGuid(), Tipo = "Chamado", Descricao = "Lâmpada queimada no corredor do Bloco B", DataOcorrencia = DateTime.UtcNow.AddDays(-1) }
        };

        var dashboardData = new DashboardGeralDto
        {
            Metricas = mockMetrics,
            Alertas = mockAlerts,
            AtividadesRecentes = mockAtividades.OrderByDescending(a => a.DataOcorrencia).ToList()
        };

        return Task.FromResult(dashboardData);
    }
}
