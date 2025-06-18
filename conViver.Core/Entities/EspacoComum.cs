namespace conViver.Core.Entities;

public class EspacoComum
{
    public Guid Id { get; set; }
    public Guid CondominioId { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string? Descricao { get; set; }
    public decimal? TaxaReserva { get; set; }
}
