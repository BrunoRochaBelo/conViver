using conViver.Core.Entities;
using conViver.Core.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace conViver.Application.Services;

public class ContaBancariaService
{
    private readonly IRepository<ContaBancaria> _contaRepository;
    private readonly IRepository<ExtratoBancario> _extratoRepository;

    public ContaBancariaService(IRepository<ContaBancaria> contaRepository, IRepository<ExtratoBancario> extratoRepository)
    {
        _contaRepository = contaRepository;
        _extratoRepository = extratoRepository;
    }

    public async Task<ContaBancaria?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await _contaRepository.GetByIdAsync(id, ct);
    }

    public async Task AdicionarLancamentoAsync(Guid contaId, decimal valor, string tipo, string? historico, CancellationToken ct = default)
    {
        var conta = await _contaRepository.GetByIdAsync(contaId, ct);
        if (conta == null) return;

        if (tipo.Equals("saida", StringComparison.OrdinalIgnoreCase))
            conta.SaldoAtual -= valor;
        else
            conta.SaldoAtual += valor;

        var extrato = new ExtratoBancario
        {
            Id = Guid.NewGuid(),
            ContaBancariaId = contaId,
            Valor = valor,
            Tipo = tipo,
            Historico = historico,
            Data = DateTime.UtcNow
        };

        await _extratoRepository.AddAsync(extrato, ct);
        await _contaRepository.UpdateAsync(conta, ct);
        await _extratoRepository.SaveChangesAsync(ct);
    }

    public async Task<decimal> AtualizarSaldoAsync(Guid contaId, CancellationToken ct = default)
    {
        var conta = await _contaRepository.GetByIdAsync(contaId, ct);
        if (conta == null) return 0m;

        var totalEntradas = await _extratoRepository.Query()
            .Where(e => e.ContaBancariaId == contaId && e.Tipo == "entrada")
            .SumAsync(e => e.Valor, ct);
        var totalSaidas = await _extratoRepository.Query()
            .Where(e => e.ContaBancariaId == contaId && e.Tipo == "saida")
            .SumAsync(e => e.Valor, ct);

        conta.SaldoAtual = totalEntradas - totalSaidas;
        await _contaRepository.UpdateAsync(conta, ct);
        await _contaRepository.SaveChangesAsync(ct);
        return conta.SaldoAtual;
    }

    public async Task<IEnumerable<ExtratoBancario>> GetExtratoConsolidadoAsync(Guid contaId, DateTime inicio, DateTime fim, CancellationToken ct = default)
    {
        return await _extratoRepository.Query()
            .Where(e => e.ContaBancariaId == contaId && e.Data >= inicio && e.Data <= fim)
            .OrderBy(e => e.Data)
            .ToListAsync(ct);
    }
}
