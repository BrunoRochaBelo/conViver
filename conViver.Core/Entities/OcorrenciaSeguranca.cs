namespace conViver.Core.Entities;

public class OcorrenciaSeguranca
{
    public Guid Id { get; set; }
    public Guid CondominioId { get; set; }
    public Guid? UnidadeId { get; set; }
    public Guid UsuarioId { get; set; }
    public string Categoria { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    public string Local { get; set; } = string.Empty;
    public DateTime DataRegistro { get; set; } = DateTime.UtcNow;
    public string Status { get; set; } = "Aberta";
    public string? Fotos { get; set; }
    public DateTime? DataEncerramento { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
