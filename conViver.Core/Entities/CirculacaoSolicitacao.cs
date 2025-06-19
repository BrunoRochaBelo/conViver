namespace conViver.Core.Entities;

public class CirculacaoSolicitacao
{
    public Guid Id { get; set; }
    public Guid CondominioId { get; set; }
    public Guid UnidadeId { get; set; }
    public Guid? PrestadorServicoId { get; set; }
    public string? NomePrestador { get; set; }
    public string TipoServico { get; set; } = string.Empty;
    public DateTime DataEntradaPrevista { get; set; }
    public DateTime? DataSaidaPrevista { get; set; }
    public bool ImpactoColetivo { get; set; }
    public bool Aprovado { get; set; } = false;
    public bool Cancelado { get; set; } = false;
    public bool ChegadaConfirmada { get; set; } = false;
    public string? Observacoes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
