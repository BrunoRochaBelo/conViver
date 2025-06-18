namespace conViver.Core.DTOs;

public class LancamentoFinanceiroDto
{
    public Guid Id { get; set; }
    public Guid UnidadeId { get; set; }
    public string Tipo { get; set; } = string.Empty;
    public decimal Valor { get; set; }
    public DateTime Data { get; set; }
    public string? Descricao { get; set; }
}
