using conViver.Core.Entities;
using conViver.Core.Interfaces;
using conViver.Core.Enums;
using Microsoft.EntityFrameworkCore;

namespace conViver.Application;

public class FinanceiroService
{
    private readonly IRepository<Boleto> _boletos;
    private readonly IFinanceiroService _gateway;

    public FinanceiroService(IRepository<Boleto> boletos, IFinanceiroService gateway)
    {
        _boletos = boletos;
        _gateway = gateway;
    }

    public async Task<Boleto> CriarBoletoAsync(Guid unidadeId, decimal valor, DateTime vencimento, CancellationToken ct = default)
    {
        if (vencimento.Date < DateTime.UtcNow.Date.AddDays(3))
            throw new InvalidOperationException("Data de vencimento invalida");

        var boleto = new Boleto
        {
            Id = Guid.NewGuid(),
            UnidadeId = unidadeId,
            Valor = valor,
            DataVencimento = vencimento.Date,
            NossoNumero = Guid.NewGuid().ToString("N").Substring(0, 10),
            CodigoBanco = "999",
            Status = BoletoStatus.Gerado
        };

        await _boletos.AddAsync(boleto, ct);
        await _boletos.SaveChangesAsync(ct);

        return boleto;
    }

    public Task<Boleto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return _boletos.GetByIdAsync(id, ct);
    }

    public async Task<IEnumerable<Boleto>> ListarAsync(string? status, CancellationToken ct = default)
    {
        var query = _boletos.Query();
        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<BoletoStatus>(status, true, out var st))
            query = query.Where(b => b.Status == st);
        return await query.ToListAsync(ct);
    }

    public async Task RegistrarPagamentoAsync(Guid boletoId, decimal valor, CancellationToken ct = default)
    {
        var boleto = await _boletos.GetByIdAsync(boletoId, ct);
        if (boleto == null) throw new InvalidOperationException("Boleto nao encontrado");

        await _gateway.RegistrarPagamentoAsync(boleto, valor, ct);
        await _boletos.SaveChangesAsync(ct);
    }

    public async Task CancelarAsync(Guid boletoId, CancellationToken ct = default)
    {
        var boleto = await _boletos.GetByIdAsync(boletoId, ct);
        if (boleto == null) return;
        if (boleto.Status == BoletoStatus.Pago)
            throw new InvalidOperationException("Boleto pago");
        boleto.Status = BoletoStatus.Cancelado;
        boleto.UpdatedAt = DateTime.UtcNow;
        await _boletos.UpdateAsync(boleto, ct);
        await _boletos.SaveChangesAsync(ct);
    }
}

