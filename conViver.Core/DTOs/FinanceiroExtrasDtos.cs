using System;
using System.Collections.Generic;

namespace conViver.Core.DTOs;

public class ManualPaymentInputDto
{
    public Guid BoletoId { get; set; }
    public decimal Valor { get; set; }
    public DateTime DataPagamento { get; set; }
}

public class PagamentoWebhookDto
{
    public string NossoNumero { get; set; } = string.Empty;
    public DateTime DataPagamento { get; set; }
    public decimal ValorPago { get; set; }
    public Guid TraceId { get; set; }
}

public class RefundRequestDto
{
    public Guid PagamentoId { get; set; }
    public string Motivo { get; set; } = string.Empty;
}

public class PagamentoDto
{
    public Guid PagamentoId { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class BoletoPdfDto
{
    public string PdfBase64 { get; set; } = string.Empty;
    public string BrCode { get; set; } = string.Empty;
    public Dictionary<string, object> Metadados { get; set; } = new();
}

public class InstallmentPlanInputDto
{
    public Guid UnidadeId { get; set; }
    public decimal Entrada { get; set; }
    public short Parcelas { get; set; }
}

public class InstallmentDto
{
    public short Numero { get; set; }
    public decimal Valor { get; set; }
    public DateTime Vencimento { get; set; }
    public bool Pago { get; set; }
}

public class InstallmentPlanDto
{
    public Guid Id { get; set; }
    public decimal ValorTotal { get; set; }
    public decimal Entrada { get; set; }
    public List<InstallmentDto> Parcelas { get; set; } = new();
}
