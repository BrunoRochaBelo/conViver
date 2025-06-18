using conViver.Core.Enums;

namespace conViver.Core.Entities;

public class Acordo
{
    public Guid Id { get; set; }
    public Guid UnidadeId { get; set; }
    public decimal ValorTotal { get; set; }
    public decimal Entrada { get; set; }
    public short Parcelas { get; set; }
    public AcordoStatus Status { get; set; } = AcordoStatus.Ativo;
    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
}
