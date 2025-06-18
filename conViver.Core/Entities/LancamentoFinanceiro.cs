namespace conViver.Core.Entities;

public class LancamentoFinanceiro
{
    public Guid Id { get; set; }
    public Guid UnidadeId { get; set; }
    public string Tipo { get; set; } = string.Empty; // credito ou debito
    public decimal Valor { get; set; }
    public DateTime Data { get; set; } = DateTime.UtcNow;
    public string? Descricao { get; set; }
}
