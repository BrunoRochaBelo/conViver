using conViver.Core.Enums;

namespace conViver.Core.Entities;

public class Reserva
{
    public Guid Id { get; set; }
    public Guid UnidadeId { get; set; }
    public string Area { get; set; } = string.Empty;
    public DateTime Inicio { get; set; }
    public DateTime Fim { get; set; }
    public ReservaStatus Status { get; set; } = ReservaStatus.Pendente;
    public decimal? Taxa { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
