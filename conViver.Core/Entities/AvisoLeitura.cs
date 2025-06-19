namespace conViver.Core.Entities;

public class AvisoLeitura
{
    public Guid Id { get; set; }
    public Guid AvisoId { get; set; }
    public Guid UsuarioId { get; set; }
    public DateTime LidoEm { get; set; } = DateTime.UtcNow;
    public string? Ip { get; set; }
    public string? DeviceId { get; set; }
}
