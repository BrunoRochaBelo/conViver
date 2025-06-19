using System.ComponentModel.DataAnnotations;

namespace conViver.Core.DTOs;

public class CirculacaoInputDto
{
    [Required]
    public Guid UnidadeId { get; set; }
    public Guid? PrestadorServicoId { get; set; }
    public string? NomePrestador { get; set; }
    [Required]
    public string TipoServico { get; set; } = string.Empty;
    [Required]
    public DateTime DataEntradaPrevista { get; set; }
    public DateTime? DataSaidaPrevista { get; set; }
    public bool ImpactoColetivo { get; set; }
    public string? Observacoes { get; set; }
}

public class CirculacaoDto
{
    public Guid Id { get; set; }
    public Guid UnidadeId { get; set; }
    public Guid? PrestadorServicoId { get; set; }
    public string? NomePrestador { get; set; }
    public string TipoServico { get; set; } = string.Empty;
    public DateTime DataEntradaPrevista { get; set; }
    public DateTime? DataSaidaPrevista { get; set; }
    public bool ImpactoColetivo { get; set; }
    public bool Aprovado { get; set; }
    public bool Cancelado { get; set; }
    public bool ChegadaConfirmada { get; set; }
    public string? Observacoes { get; set; }
}
