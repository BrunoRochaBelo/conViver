using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace conViver.Core.DTOs;

// --- New DTO for Progress Tracking ---
public class OsProgressoDto
{
    public DateTime Data { get; set; }
    public Guid UsuarioId { get; set; } // ID of user/prestador who made the change
    public string? NomeUsuario { get; set; } // Name of user/prestador (to be filled by service)
    public string? Descricao { get; set; } // E.g., "Status alterado", "Comentário adicionado"
    public string? StatusAntigo { get; set; }
    public string? StatusNovo { get; set; }
    public string? Observacao { get; set; } // For comments or notes during progress
}

// --- Refactored DTOs ---

// DTO para Condômino/Inquilino criar OS
public class OrdemServicoInputUserDto
{
    [Required(ErrorMessage = "A descrição do problema é obrigatória.")]
    [StringLength(2000, MinimumLength = 10, ErrorMessage = "A descrição deve ter entre 10 e 2000 caracteres.")]
    public string DescricaoProblema { get; set; } = string.Empty;

    public Guid? UnidadeId { get; set; } // User's unit or null if they are indicating a general area OS (service will validate permission)

    [Required(ErrorMessage = "A categoria do serviço é obrigatória.")]
    [StringLength(100, ErrorMessage = "A categoria do serviço não pode exceder 100 caracteres.")]
    public string CategoriaServico { get; set; } = string.Empty; // Ex: "Elétrica", "Hidráulica"

    [Required(ErrorMessage = "O local do problema é obrigatório.")]
    [StringLength(200, ErrorMessage = "O local não pode exceder 200 caracteres.")]
    public string Local { get; set; } = string.Empty; // E.g., "Minha unidade", "Corredor Bloco A"

    [StringLength(1000, ErrorMessage = "Links de anexos não podem exceder 1000 caracteres.")]
    public string? Anexos { get; set; } // Simple string for URLs for now
}

// DTO para Síndico criar OS
public class OrdemServicoInputSindicoDto
{
    [Required(ErrorMessage = "O título da OS é obrigatório.")]
    [StringLength(150, MinimumLength = 5, ErrorMessage = "O título deve ter entre 5 e 150 caracteres.")]
    public string Titulo { get; set; } = string.Empty;

    [Required(ErrorMessage = "A descrição do problema é obrigatória.")]
    [StringLength(2000, MinimumLength = 10, ErrorMessage = "A descrição deve ter entre 10 e 2000 caracteres.")]
    public string DescricaoProblema { get; set; } = string.Empty;

    [StringLength(2000, ErrorMessage = "A descrição detalhada do serviço não pode exceder 2000 caracteres.")]
    public string? DescricaoServico { get; set; } // More detailed description by admin

    public Guid? UnidadeId { get; set; } // Se aplicável a uma unidade específica

    [Required(ErrorMessage = "O local da OS é obrigatório.")]
    [StringLength(200, ErrorMessage = "O local não pode exceder 200 caracteres.")]
    public string Local { get; set; } = string.Empty;

    [Required(ErrorMessage = "A categoria do serviço é obrigatória.")]
    [StringLength(100, ErrorMessage = "A categoria do serviço não pode exceder 100 caracteres.")]
    public string CategoriaServico { get; set; } = "Manutenção Geral";

    public Guid? PrestadorServicoId { get; set; } // ID do prestador atribuído

    public DateTime? DataAgendamento { get; set; }

    [Range(0, 1000000, ErrorMessage = "O custo estimado deve ser um valor não negativo.")]
    public decimal? CustoEstimado { get; set; }

    [Required(ErrorMessage = "A prioridade é obrigatória.")]
    [RegularExpression("Baixa|Media|Alta|Urgente", ErrorMessage = "Prioridade inválida. Use: Baixa, Media, Alta, Urgente.")]
    public string Prioridade { get; set; } = "Media";

    [StringLength(1000, ErrorMessage = "Links de anexos não podem exceder 1000 caracteres.")]
    public string? Anexos { get; set; }

    [StringLength(2000, ErrorMessage = "Observações do síndico não podem exceder 2000 caracteres.")]
    public string? ObservacoesSindico { get; set; }

    public bool ImpactoColetivo { get; set; } = false;
}

// DTO para Síndico atualizar OS (replaces OrdemServicoStatusUpdateDto)
public class OrdemServicoUpdateSindicoDto
{
    [StringLength(150, MinimumLength = 5, ErrorMessage = "O título deve ter entre 5 e 150 caracteres.")]
    public string? Titulo { get; set; }

    [StringLength(2000, MinimumLength = 10, ErrorMessage = "A descrição do problema deve ter entre 10 e 2000 caracteres.")]
    public string? DescricaoProblema { get; set; }

    [StringLength(2000, ErrorMessage = "A descrição detalhada do serviço não pode exceder 2000 caracteres.")]
    public string? DescricaoServico { get; set; }

    public Guid? UnidadeId { get; set; }

    [StringLength(200, ErrorMessage = "O local não pode exceder 200 caracteres.")]
    public string? Local { get; set; }

    [StringLength(100, ErrorMessage = "A categoria do serviço não pode exceder 100 caracteres.")]
    public string? CategoriaServico { get; set; }

    public Guid? PrestadorServicoId { get; set; } // Allow changing/assigning provider

    public DateTime? DataAgendamento { get; set; }

    [Range(0, 1000000, ErrorMessage = "O custo estimado deve ser um valor não negativo.")]
    public decimal? CustoEstimado { get; set; }

    [Range(0, 1000000, ErrorMessage = "O custo final deve ser um valor não negativo.")]
    public decimal? CustoFinal { get; set; }

    [RegularExpression("Baixa|Media|Alta|Urgente", ErrorMessage = "Prioridade inválida. Use: Baixa, Media, Alta, Urgente.")]
    public string? Prioridade { get; set; }

    [Required(ErrorMessage = "O status é obrigatório.")]
    [StringLength(50, ErrorMessage = "Status não pode exceder 50 caracteres.")]
    // Example: "Aberta", "EmAndamento", "AguardandoPecas", "AguardandoAprovacaoOrcamento", "Concluida", "Encerrada", "Cancelada"
    public string Status { get; set; } = string.Empty;

    [StringLength(1000, ErrorMessage = "Links de anexos não podem exceder 1000 caracteres.")]
    public string? Anexos { get; set; }

    [StringLength(2000, ErrorMessage = "As observações do síndico não podem exceder 2000 caracteres.")]
    public string? ObservacoesSindico { get; set; }

    [StringLength(2000, ErrorMessage = "O relatório final não pode exceder 2000 caracteres.")]
    public string? RelatorioFinal { get; set; } // Added for admin to fill when closing

    public bool? ImpactoColetivo { get; set; }
    public bool? AvisoMuralGerado { get; set; } // Admin can mark if aviso was manually generated or needs update
}

// DTO para Prestador atualizar progresso da OS
public class OrdemServicoProgressoUpdateDto
{
    [Required(ErrorMessage = "O status é obrigatório.")]
    [StringLength(50, ErrorMessage = "Status não pode exceder 50 caracteres.")]
    // Prestador can typically move to: "EmAndamento", "AguardandoPecas", "Concluida" (service performed)
    public string Status { get; set; } = string.Empty;

    [StringLength(2000, ErrorMessage = "A descrição do progresso não pode exceder 2000 caracteres.")]
    public string? DescricaoProgresso { get; set; } // Prestador's comment on the progress

    [StringLength(1000, ErrorMessage = "Links de anexos de evidência não podem exceder 1000 caracteres.")]
    public string? AnexosEvidencia { get; set; } // Prestador can add photos/docs
}

// DTO genérico para exibir Ordens de Serviço
public class OrdemServicoDto
{
    public Guid Id { get; set; }
    public Guid CondominioId { get; set; }
    public string Titulo { get; set; } = string.Empty;
    public string DescricaoProblema { get; set; } = string.Empty; // User's initial description
    public string? DescricaoServico { get; set; } // Admin/Provider's detailed service description
    public Guid UsuarioSolicitanteId { get; set; }
    public string? NomeUsuarioSolicitante { get; set; } // To be populated by service
    public Guid? UnidadeId { get; set; }
    public string? NomeUnidade { get; set; } // To be populated by service (e.g., "Apto 101", "Bloco B")
    public string Local { get; set; } = string.Empty;
    public string CategoriaServico { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Prioridade { get; set; } = string.Empty;
    public DateTime DataAbertura { get; set; }
    public DateTime? DataAgendamento { get; set; }
    public DateTime? DataConclusao { get; set; } // When service was marked Concluida by provider/admin
    public DateTime? DataEncerramento { get; set; } // When OS was marked Encerrada by admin
    public Guid? PrestadorServicoId { get; set; }
    public string? NomePrestadorServico { get; set; } // To be populated by service
    public decimal? CustoEstimado { get; set; }
    public decimal? CustoFinal { get; set; }
    public string? Anexos { get; set; } // JSON string of URLs
    public string? ObservacoesSindico { get; set; }
    public string? RelatorioFinal { get; set; }
    public bool ImpactoColetivo { get; set; }
    public bool AvisoMuralGerado { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<OsProgressoDto> HistoricoProgresso { get; set; } = new List<OsProgressoDto>();
}

// DTO Resumido para listas (como no histórico do prestador)
// Este DTO foi adicionado em um passo anterior e deve ser mantido.
public class OrdemServicoResumoDto
{
    public Guid Id { get; set; }
    public DateTime? DataServico { get; set; } // Maps to OS.DataAgendamento or OS.DataConclusao or OS.CriadoEm
    public string? DescricaoBreve { get; set; } // Maps to OS.Titulo or part of OS.DescricaoServico / OS.DescricaoProblema
    public string? Status { get; set; } // Maps to OS.Status.ToString()
}
