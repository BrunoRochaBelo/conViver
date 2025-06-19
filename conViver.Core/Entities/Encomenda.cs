using conViver.Core.Enums;

namespace conViver.Core.Entities;

public class Encomenda
{
    public Guid Id { get; set; }
    public Guid UnidadeId { get; set; }
    public string? Descricao { get; set; }
    public string? FotoUrl { get; set; }
    public Guid? RecebidoPor { get; set; }
    public DateTime RecebidoEm { get; set; } = DateTime.UtcNow;
    public DateTime? RetiradoEm { get; set; }
    public Guid? RetiradoPor { get; set; }
    public string? CodigoRastreio { get; set; }
    public string? Remetente { get; set; }
    public string? Observacoes { get; set; }
    public EncomendaStatus Status { get; set; }
    public DateTime DataStatus { get; set; }
    public string? CodigoRetirada { get; set; }
    public string? RetiradoPorTerceiroNome { get; set; }
    public string? RetiradoPorTerceiroDocumento { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
