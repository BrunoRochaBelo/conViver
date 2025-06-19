using System.ComponentModel.DataAnnotations;

namespace conViver.Core.DTOs;

public class OcorrenciaInputDto
{
    [Required]
    public string Categoria { get; set; } = string.Empty;
    [Required]
    public string Descricao { get; set; } = string.Empty;
    [Required]
    public string Local { get; set; } = string.Empty;
    public Guid? UnidadeId { get; set; }
    public string? Fotos { get; set; }
}

public class OcorrenciaDto
{
    public Guid Id { get; set; }
    public string Categoria { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    public string Local { get; set; } = string.Empty;
    public Guid? UnidadeId { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime DataRegistro { get; set; }
    public DateTime? DataEncerramento { get; set; }
    public string? Fotos { get; set; }
}

public class OcorrenciaStatusUpdateDto
{
    [Required]
    public string Status { get; set; } = string.Empty;
}
