namespace conViver.Core.Entities;

public class Visitante
{
    public Guid Id { get; set; }
    public Guid UnidadeId { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string? Documento { get; set; }
    public string? FotoUrl { get; set; }
    public DateTime DataChegada { get; set; } = DateTime.UtcNow;
    public DateTime? DataSaida { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
