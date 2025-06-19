using System;
using System.ComponentModel.DataAnnotations;

namespace conViver.Core.DTOs;

public class ReservaInputDto
{
    [Required(ErrorMessage = "A ID da unidade é obrigatória.")]
    public Guid UnidadeId { get; set; } // ID da unidade que está reservando

    [Required(ErrorMessage = "A identificação da área comum é obrigatória.")]
    [StringLength(100, ErrorMessage = "O nome da área não pode exceder 100 caracteres.")]
    public string AreaComumId { get; set; } = string.Empty; // ID ou nome da área comum

    [Required(ErrorMessage = "A data e hora de início são obrigatórias.")]
    public DateTime Inicio { get; set; }

    [Required(ErrorMessage = "A data e hora de fim são obrigatórias.")]
    public DateTime Fim { get; set; }

    [StringLength(500, ErrorMessage = "Observações não podem exceder 500 caracteres.")]
    public string? Observacoes { get; set; }
}

public class ReservaStatusUpdateDto
{
    [Required(ErrorMessage = "O status da reserva é obrigatório.")]
    [StringLength(50, ErrorMessage = "O status não pode exceder 50 caracteres.")]
    // Ex: "Aprovada", "Recusada", "Pendente"
    public string Status { get; set; } = string.Empty;

    [StringLength(500, ErrorMessage = "A justificativa não pode exceder 500 caracteres.")]
    public string? Justificativa { get; set; } // Para o síndico ao aprovar/recusar
}

public class ReservaDto
{
    public Guid Id { get; set; }
    public Guid CondominioId { get; set; }
    public Guid UnidadeId { get; set; }
    // public string? NomeUnidade { get; set; } // Ex: "Apto 101" (requereria join/lookup)
    public Guid UsuarioId { get; set; } // Quem solicitou
    // public string? NomeUsuario { get; set; } // (requereria join/lookup)
    public string AreaComumId { get; set; } = string.Empty;
    // public string? NomeAreaComum { get; set; } // (requereria join/lookup)
    public DateTime Inicio { get; set; }
    public DateTime Fim { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime DataSolicitacao { get; set; }
    public string? Observacoes { get; set; }
    public Guid? AprovadorId { get; set; } // Síndico ou sistema que aprovou/recusou
    public string? JustificativaAprovacaoRecusa { get; set; }
}

// DTO para a visualização da agenda
public class AgendaReservaDto
{
    public Guid Id { get; set; }
    public string AreaComumId { get; set; } = string.Empty;
    // public string? NomeAreaComum { get; set; }
    public DateTime Inicio { get; set; }
    public DateTime Fim { get; set; }
    public string Status { get; set; } = string.Empty;
    public Guid UnidadeId { get; set; }
    // public string? NomeUnidade { get; set; }
    public string TituloReserva { get; set; } = string.Empty; // Ex: "Apto 101 - Churrasqueira"
}
