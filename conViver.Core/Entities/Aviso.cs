namespace conViver.Core.Entities;

public class Aviso
{
    public Guid Id { get; set; }
    public Guid CondominioId { get; set; }
    public string Categoria { get; set; } = string.Empty;
    public string Titulo { get; set; } = string.Empty;
    public string? Corpo { get; set; }
    public DateTime PublicadoEm { get; set; } = DateTime.UtcNow;
    public Guid? PublicadoPor { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
