namespace conViver.Core.Entities;

public class Boleto
{
    public Guid Id { get; set; }
    public Guid UnidadeId { get; set; }
    public string NossoNumero { get; set; } = string.Empty;
    public string LinhaDigitavel { get; set; } = string.Empty;
    public string CodigoBanco { get; set; } = string.Empty;
    public decimal Valor { get; set; }
    public DateTime DataVencimento { get; set; }
    public string Status { get; set; } = "gerado";
    public DateTime? DataRegistro { get; set; }
    public DateTime? DataEnvio { get; set; }
    public DateTime? DataPagamento { get; set; }
    public decimal? ValorPago { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
