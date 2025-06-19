using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace conViver.Core.DTOs;

// DTOs para Votação

public class OpcaoInputDto
{
    [Required(ErrorMessage = "A descrição da opção é obrigatória.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "A descrição da opção deve ter entre 1 e 200 caracteres.")]
    public string Descricao { get; set; } = string.Empty;
}

public class VotacaoInputDto
{
    [Required(ErrorMessage = "O título da votação é obrigatório.")]
    [StringLength(150, MinimumLength = 3, ErrorMessage = "O título deve ter entre 3 e 150 caracteres.")]
    public string Titulo { get; set; } = string.Empty;

    [StringLength(500, ErrorMessage = "A descrição não pode exceder 500 caracteres.")]
    public string? Descricao { get; set; }

    public DateTime? DataFim { get; set; }

    [Required(ErrorMessage = "É necessário fornecer as opções de voto.")]
    [MinLength(2, ErrorMessage = "A votação deve ter pelo menos duas opções.")]
    public List<OpcaoInputDto> Opcoes { get; set; } = new List<OpcaoInputDto>();
}

public class OpcaoVotacaoDto
{
    public Guid Id { get; set; }
    public string Descricao { get; set; } = string.Empty;
    public int QuantidadeVotos { get; set; }
}

public class VotacaoDetalheDto
{
    public Guid Id { get; set; }
    public string Titulo { get; set; } = string.Empty;
    public string? Descricao { get; set; }
    public DateTime DataInicio { get; set; }
    public DateTime? DataFim { get; set; }
    public string Status { get; set; } = string.Empty; // Aberta, Encerrada, Apurada
    public List<OpcaoVotacaoDto> Opcoes { get; set; } = new List<OpcaoVotacaoDto>();
    public Guid CriadoPor { get; set; }
    public bool UsuarioJaVotou { get; set; }
}

public class VotacaoResumoDto
{
    public Guid Id { get; set; }
    public string Titulo { get; set; } = string.Empty;
    public DateTime DataInicio { get; set; }
    public DateTime? DataFim { get; set; }
    public string Status { get; set; } = string.Empty; // Aberta, Encerrada, Apurada
}

public class VotoInputDto
{
    [Required(ErrorMessage = "O ID da opção é obrigatório.")]
    public Guid OpcaoId { get; set; }
}
