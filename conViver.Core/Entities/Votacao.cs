namespace conViver.Core.Entities;

public class Votacao
{
    public Guid Id { get; set; }
    public Guid CondominioId { get; set; }
    public string Titulo { get; set; } = string.Empty;
    public string? Descricao { get; set; }
    public DateTime DataInicio { get; set; } = DateTime.UtcNow;
    public DateTime DataFim { get; set; }
    public bool Ativa { get; set; } = true;
}
