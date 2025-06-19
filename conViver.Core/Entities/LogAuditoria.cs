namespace conViver.Core.Entities;

public class LogAuditoria
{
    public Guid Id { get; set; }
    public Guid? UsuarioId { get; set; }
    public string Acao { get; set; } = string.Empty;
    public string Entidade { get; set; } = string.Empty;
    public Guid? EntityId { get; set; }
    public string? Detalhes { get; set; }
    public Guid? TraceId { get; set; }
    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
}
