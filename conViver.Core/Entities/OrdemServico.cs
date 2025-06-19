using conViver.Core.Enums;

namespace conViver.Core.Entities;

public class OrdemServico
{
    public Guid Id { get; set; }
    public Guid UnidadeId { get; set; }
    public Guid? PrestadorId { get; set; }
    public string? Descricao { get; set; }
    public OrdemServicoStatus Status { get; set; } = OrdemServicoStatus.Aberta;
    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
    public DateTime? ConcluidoEm { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
