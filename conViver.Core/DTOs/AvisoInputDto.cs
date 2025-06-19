using System.ComponentModel.DataAnnotations;

namespace conViver.Core.DTOs;

public class AvisoInputDto
{
    [Required]
    public string Categoria { get; set; } = string.Empty;

    [Required]
    public string Titulo { get; set; } = string.Empty;

    public string? Corpo { get; set; }
}
