using System;
using System.ComponentModel.DataAnnotations;

namespace conViver.Core.DTOs;

public class PrestadorInputDto
{
    [Required(ErrorMessage = "O nome do prestador é obrigatório.")]
    [StringLength(150, MinimumLength = 3, ErrorMessage = "O nome deve ter entre 3 e 150 caracteres.")]
    public string Nome { get; set; } = string.Empty;

    [Phone(ErrorMessage = "Número de telefone inválido.")]
    [StringLength(20, ErrorMessage = "O telefone não pode exceder 20 caracteres.")]
    public string? Telefone { get; set; }

    [EmailAddress(ErrorMessage = "Endereço de e-mail inválido.")]
    [StringLength(100, ErrorMessage = "O e-mail não pode exceder 100 caracteres.")]
    public string? Email { get; set; }

    [StringLength(20, ErrorMessage = "O documento (CNPJ/CPF) não pode exceder 20 caracteres.")]
    public string? Documento { get; set; } // CNPJ ou CPF

    [StringLength(100, ErrorMessage = "A especialidade não pode exceder 100 caracteres.")]
    public string? Especialidade { get; set; }

    [StringLength(250, ErrorMessage = "O endereço não pode exceder 250 caracteres.")]
    public string? EnderecoCompleto { get; set; }
}

public class PrestadorDto
{
    public Guid Id { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string? Telefone { get; set; }
    public string? Email { get; set; }
    public string? Documento { get; set; }
    public string? Especialidade { get; set; }
    public string? EnderecoCompleto { get; set; }
    public double? RatingMedio { get; set; }
    public int TotalAvaliacoes { get; set; }
    public List<AvaliacaoPrestadorDto> DetalhesAvaliacoes { get; set; } = new List<AvaliacaoPrestadorDto>(); // Adicionado
    // public bool Ativo { get; set; } // Pode ser útil retornar o status Ativo
}

public class AvaliacaoPrestadorInputDto
{
    [Required(ErrorMessage = "A nota da avaliação é obrigatória.")]
    [Range(1, 5, ErrorMessage = "A nota deve ser entre 1 e 5.")]
    public int Nota { get; set; }

    [StringLength(1000, ErrorMessage = "O comentário não pode exceder 1000 caracteres.")]
    public string? Comentario { get; set; }

    public Guid? OrdemServicoId { get; set; } // Opcional, para vincular a avaliação a uma OS específica
}

public class AvaliacaoPrestadorDto
{
    public Guid Id { get; set; }
    public Guid UsuarioId { get; set; } // ID do usuário que avaliou
    public string NomeUsuario { get; set; } = string.Empty; // Nome do usuário (a ser preenchido, ou simplificar)
    public int Nota { get; set; }
    public string? Comentario { get; set; }
    public DateTime DataAvaliacao { get; set; }
    public Guid? OrdemServicoId {get; set; }
}
