using conViver.Core.Enums;

namespace conViver.Core.Entities;

public class Boleto
{
    public Guid Id { get; set; }
    public Guid UnidadeId { get; set; }
    public string NossoNumero { get; private set; } = string.Empty;
    public string LinhaDigitavel { get; private set; } = string.Empty;
    public string CodigoBanco { get; private set; } = string.Empty;
    public decimal Valor { get; set; }
    public DateTime DataVencimento { get; set; }
    public BoletoStatus Status { get; private set; } = BoletoStatus.Gerado;
    public DateTime? DataRegistro { get; private set; }
    public DateTime? DataEnvio { get; private set; }
    public DateTime? DataPagamento { get; private set; }
    public decimal? ValorPago { get; private set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;

    public void Registrar(string linhaDigitavel, string nossoNumero, string codigoBanco, DateTime dataRegistro)
    {
        if (Status != BoletoStatus.Gerado)
            throw new InvalidOperationException("Boleto já registrado ou processado.");

        if (DataVencimento.Date < dataRegistro.Date.AddDays(3))
            throw new InvalidOperationException("Data de vencimento deve ser ao menos 3 dias após o registro.");

        LinhaDigitavel = linhaDigitavel;
        NossoNumero = nossoNumero;
        CodigoBanco = codigoBanco;
        DataRegistro = dataRegistro.Date;
        Status = BoletoStatus.Registrado;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Enviar(DateTime dataEnvio)
    {
        if (Status != BoletoStatus.Registrado)
            throw new InvalidOperationException("Somente boletos registrados podem ser enviados.");

        DataEnvio = dataEnvio;
        Status = BoletoStatus.Enviado;
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarcarVencido(DateTime hoje)
    {
        if (Status == BoletoStatus.Enviado && hoje.Date > DataVencimento.Date)
        {
            Status = BoletoStatus.Vencido;
            UpdatedAt = DateTime.UtcNow;
        }
    }

    public void RegistrarPagamento(decimal valor, DateTime dataPagamento)
    {
        if (Status == BoletoStatus.Cancelado)
            throw new InvalidOperationException("Boleto cancelado não pode ser pago.");

        ValorPago = valor;
        DataPagamento = dataPagamento;
        Status = BoletoStatus.Pago;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Cancelar()
    {
        if (Status == BoletoStatus.Pago)
            throw new InvalidOperationException("Boleto pago não pode ser cancelado.");

        Status = BoletoStatus.Cancelado;
        UpdatedAt = DateTime.UtcNow;
    }
}
