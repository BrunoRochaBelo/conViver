namespace conViver.Core.Entities;

public class ParcelaAcordo
{
    public Guid Id { get; set; }
    public Guid AcordoId { get; set; }
    public Guid? BoletoId { get; set; }
    public short Numero { get; set; }
    public decimal Valor { get; set; }
    public DateTime Vencimento { get; set; }
    public bool Pago { get; set; } = false;
}
