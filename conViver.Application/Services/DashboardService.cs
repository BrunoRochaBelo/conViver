using conViver.Core.DTOs;
using conViver.Core.Entities;
using conViver.Core.Enums;
using conViver.Core.Interfaces;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace conViver.Application.Services;

public class DashboardService
{
    private readonly IRepository<Boleto> _boletoRepository;
    private readonly IRepository<Pagamento> _pagamentoRepository;
    private readonly IRepository<LancamentoFinanceiro> _lancamentoRepository;
    private readonly IRepository<Unidade> _unidadeRepository;

    public DashboardService(
        IRepository<Boleto> boletoRepository,
        IRepository<Pagamento> pagamentoRepository,
        IRepository<LancamentoFinanceiro> lancamentoRepository,
        IRepository<Unidade> unidadeRepository)
    {
        _boletoRepository = boletoRepository;
        _pagamentoRepository = pagamentoRepository;
        _lancamentoRepository = lancamentoRepository;
        _unidadeRepository = unidadeRepository;
    }

    public async Task<DashboardGeralDto> GetDashboardGeralAsync(Guid condominioId)
    {
        var boletosQuery = from b in _boletoRepository.Query()
                           join u in _unidadeRepository.Query() on b.UnidadeId equals u.Id
                           where u.CondominioId == condominioId
                           select b;

        var totalBoletos = await boletosQuery.CountAsync();
        var boletosPendentes = boletosQuery.Where(b =>
            b.Status == BoletoStatus.Gerado ||
            b.Status == BoletoStatus.Registrado ||
            b.Status == BoletoStatus.Enviado ||
            b.Status == BoletoStatus.Vencido);

        var totalPendentes = await boletosPendentes.CountAsync();
        var valorPendentes = await boletosPendentes.SumAsync(b => b.Valor - (b.ValorPago ?? 0));

        var inadimplenciaPercentual = totalBoletos == 0 ? 0m : Math.Round((decimal)totalPendentes / totalBoletos * 100, 2);

        var lancamentosQuery = from l in _lancamentoRepository.Query()
                               join u in _unidadeRepository.Query() on l.UnidadeId equals u.Id
                               where u.CondominioId == condominioId
                               select l;

        var totalCreditos = await lancamentosQuery.Where(l => l.Tipo.ToLower() == "credito").SumAsync(l => l.Valor);
        var totalDebitos = await lancamentosQuery.Where(l => l.Tipo.ToLower() == "debito").SumAsync(l => l.Valor);
        var saldoDisponivel = totalCreditos - totalDebitos;

        var proximasDespesas = await lancamentosQuery
            .Where(l => l.Tipo.ToLower() == "debito" && l.Data >= DateTime.UtcNow)
            .OrderBy(l => l.Data)
            .Take(5)
            .Select(l => new ProximaDespesaDto
            {
                Id = l.Id,
                Descricao = l.Descricao ?? string.Empty,
                Valor = l.Valor,
                DataVencimento = l.Data
            })
            .ToListAsync();

        var metrics = new DashboardMetricsDto
        {
            InadimplenciaPercentual = inadimplenciaPercentual,
            InadimplenciaValorTotal = valorPendentes,
            SaldoDisponivel = saldoDisponivel,
            ProximasDespesas = proximasDespesas
        };

        return new DashboardGeralDto
        {
            Metricas = metrics,
            Alertas = new List<AlertaDto>(),
            AtividadesRecentes = new List<AtividadeRecenteDto>()
        };
    }
}
