using conViver.Core.Enums;

namespace conViver.Core.Entities;

public class Pagamento
{
    public Guid Id { get; set; }
    public Guid? BoletoId { get; set; }
    public string Origem { get; set; } = string.Empty; // pix, cartao, boleto
    public decimal ValorPago { get; set; }
    public DateTime DataPgto { get; set; } = DateTime.UtcNow;
    public PagamentoStatus Status { get; set; } = PagamentoStatus.Confirmado;
    public Guid TraceId { get; set; } = Guid.NewGuid();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
