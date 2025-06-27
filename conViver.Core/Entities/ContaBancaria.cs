namespace conViver.Core.Entities;

public class ContaBancaria
{
    public Guid Id { get; set; }
    public string Banco { get; set; } = string.Empty;
    public string Agencia { get; set; } = string.Empty;
    public string Conta { get; set; } = string.Empty;
    public decimal SaldoAtual { get; set; }

    public virtual ICollection<ExtratoBancario> Lancamentos { get; set; } = new List<ExtratoBancario>();
}
