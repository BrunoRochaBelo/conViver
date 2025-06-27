namespace conViver.Core.Entities;

public class ExtratoBancario
{
    public Guid Id { get; set; }
    public Guid ContaBancariaId { get; set; }
    public string Tipo { get; set; } = string.Empty; // entrada ou saida
    public decimal Valor { get; set; }
    public DateTime Data { get; set; } = DateTime.UtcNow;
    public string? Historico { get; set; }

    public virtual ContaBancaria? ContaBancaria { get; set; }
}
