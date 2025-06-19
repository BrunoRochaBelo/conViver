using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace conViver.Core.DTOs;

// DTO para Condômino/Inquilino criar OS
public class OrdemServicoInputUserDto
{
    [Required(ErrorMessage = "A descrição do problema é obrigatória.")]
    [StringLength(1000, MinimumLength = 10, ErrorMessage = "A descrição deve ter entre 10 e 1000 caracteres.")]
    public string DescricaoProblema { get; set; } = string.Empty;

    public Guid? UnidadeId { get; set; } // Opcional, se for referente à unidade do usuário. Se nulo, área comum.

    [StringLength(100, ErrorMessage = "A categoria do serviço não pode exceder 100 caracteres.")]
    public string? CategoriaServico { get; set; } // Ex: "Elétrica", "Hidráulica", "Alvenaria"

    public List<string>? Fotos { get; set; } // Lista de URLs ou base64 (similar aos Chamados)
}

// DTO para Síndico criar OS (pode ter mais campos, como atribuição de prestador)
public class OrdemServicoInputSindicoDto
{
    [Required(ErrorMessage = "O título da OS é obrigatório.")]
    [StringLength(150, MinimumLength = 5, ErrorMessage = "O título deve ter entre 5 e 150 caracteres.")]
    public string Titulo { get; set; } = string.Empty;

    [Required(ErrorMessage = "A descrição do serviço é obrigatória.")]
    [StringLength(2000, MinimumLength = 10, ErrorMessage = "A descrição deve ter entre 10 e 2000 caracteres.")]
    public string DescricaoServico { get; set; } = string.Empty;

    public Guid? UnidadeId { get; set; } // Se aplicável a uma unidade específica

    [StringLength(100, ErrorMessage = "A categoria do serviço não pode exceder 100 caracteres.")]
    public string CategoriaServico { get; set; } = "Manutenção Geral";

    public Guid? PrestadorServicoId { get; set; } // ID do prestador atribuído

    public DateTime? DataAgendamento { get; set; }

    [Range(0, 100000, ErrorMessage = "O custo estimado deve ser um valor não negativo.")]
    public decimal? CustoEstimado { get; set; }

    [Required(ErrorMessage = "A prioridade é obrigatória.")]
    [RegularExpression("Baixa|Media|Alta|Urgente", ErrorMessage = "Prioridade inválida. Use: Baixa, Media, Alta, Urgente.")]
    public string Prioridade { get; set; } = "Media"; // Baixa, Media, Alta, Urgente

    public List<string>? Fotos { get; set; }
}

// DTO para Síndico atualizar status da OS
public class OrdemServicoStatusUpdateDto
{
    [Required(ErrorMessage = "O status é obrigatório.")]
    [StringLength(50, ErrorMessage = "Status não pode exceder 50 caracteres.")]
    // Ex: "Pendente", "EmAndamento", "Concluida", "Cancelada", "AguardandoAprovacaoOrcamento"
    public string Status { get; set; } = string.Empty;

    [StringLength(1000, ErrorMessage = "As observações internas não podem exceder 1000 caracteres.")]
    public string? ObservacaoInterna { get; set; } // Comentário do síndico sobre a atualização
}

// DTO para Prestador atualizar progresso da OS
public class OrdemServicoProgressoUpdateDto
{
    [Required(ErrorMessage = "O status é obrigatório.")]
    [StringLength(50, ErrorMessage = "Status não pode exceder 50 caracteres.")]
    // Ex: "EmAndamento", "ConcluidaParcialmente", "AguardandoPecas", "Finalizada"
    public string Status { get; set; } = string.Empty;

    [Required(ErrorMessage = "A descrição do progresso é obrigatória.")]
    [StringLength(2000, ErrorMessage = "A descrição do progresso não pode exceder 2000 caracteres.")]
    public string DescricaoProgresso { get; set; } = string.Empty;

    public List<string>? FotosEvidencia { get; set; }

    [Range(0, 100, ErrorMessage = "Percentual de conclusão deve ser entre 0 e 100.")]
    public int? PercentualConclusao { get; set; }
}

// DTO genérico para exibir Ordens de Serviço
public class OrdemServicoDto
{
    public Guid Id { get; set; }
    public Guid CondominioId { get; set; }
    public string Titulo { get; set; } = string.Empty; // Pode ser gerado se criado pelo usuário
    public string Descricao { get; set; } = string.Empty;
    public Guid UsuarioSolicitanteId { get; set; }
    // public string NomeUsuarioSolicitante { get; set; } // Requer lookup
    public Guid? UnidadeId { get; set; }
    // public string? NomeUnidade { get; set; } // Requer lookup
    public string CategoriaServico { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Prioridade { get; set; } = string.Empty;
    public DateTime DataAbertura { get; set; }
    public DateTime? DataAgendamento { get; set; }
    public DateTime? DataConclusao { get; set; }
    public Guid? PrestadorServicoId { get; set; }
    // public string? NomePrestadorServico { get; set; } // Requer lookup
    public decimal? CustoEstimado { get; set; }
    public decimal? CustoFinal { get; set; }
    public List<string> Fotos { get; set; } = new List<string>();
    public string? ObservacoesSindico { get; set; } // Respostas ou comentários do síndico
    // public List<ProgressoOsDto> HistoricoProgresso { get; set; } // Para detalhar o progresso
}

// Poderia ter um ProgressoOsDto para histórico
// public class ProgressoOsDto { ... }
