using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace conViver.Core.DTOs;

public class ChamadoInputDto
{
    [Required(ErrorMessage = "O título do chamado é obrigatório.")]
    [StringLength(100, MinimumLength = 5, ErrorMessage = "O título deve ter entre 5 e 100 caracteres.")]
    public string Titulo { get; set; } = string.Empty;

    [Required(ErrorMessage = "A descrição do chamado é obrigatória.")]
    [StringLength(1000, MinimumLength = 10, ErrorMessage = "A descrição deve ter entre 10 e 1000 caracteres.")]
    public string Descricao { get; set; } = string.Empty;

    public List<string>? Fotos { get; set; } // Lista de URLs ou base64 strings, a ser definido como será o upload

    public Guid? UnidadeId { get; set; } // Opcional, se o chamado for específico de uma unidade
}

public class ChamadoDto
{
    public Guid Id { get; set; }
    public string Titulo { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    public List<string> Fotos { get; set; } = new List<string>();
    public string Status { get; set; } = string.Empty;
    public DateTime DataAbertura { get; set; }
    public DateTime? DataResolucao { get; set; }
    public Guid UsuarioId { get; set; } // Quem abriu
    public Guid? UnidadeId { get; set; }
    public string? RespostaDoSindico { get; set; }
    public int? AvaliacaoNota { get; set; }
    public string? AvaliacaoComentario { get; set; }
    // CreatedAt e UpdatedAt podem ser omitidos do DTO se não forem relevantes para o cliente final
    // public DateTime CreatedAt {get; set;}
    // public DateTime UpdatedAt {get; set;}
}

public class ChamadoUpdateDto
{
    [Required(ErrorMessage = "O status do chamado é obrigatório.")]
    // TODO: Adicionar validação para garantir que o Status seja um dos valores permitidos
    // (ex: "EmAndamento", "Concluido", "Cancelado") usando um custom attribute ou Enum.
    public string Status { get; set; } = string.Empty;

    [StringLength(1000, ErrorMessage = "A resposta do síndico não pode exceder 1000 caracteres.")]
    public string? RespostaDoSindico { get; set; }
}

public class ChamadoAvaliacaoDto
{
    [Required(ErrorMessage = "A nota da avaliação é obrigatória.")]
    [Range(1, 5, ErrorMessage = "A nota da avaliação deve ser entre 1 e 5.")]
    public int AvaliacaoNota { get; set; }

    [StringLength(500, ErrorMessage = "O comentário da avaliação não pode exceder 500 caracteres.")]
    public string? AvaliacaoComentario { get; set; }
}
