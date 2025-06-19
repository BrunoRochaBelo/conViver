using System;
using System.Collections.Generic; // Required for List in RegrasUsoEspacoDto
using System.ComponentModel.DataAnnotations;

namespace conViver.Core.DTOs;

public class ReservaInputDto
{
    [Required(ErrorMessage = "A ID da unidade é obrigatória.")]
    public Guid UnidadeId { get; set; } // ID da unidade que está reservando

    [Required(ErrorMessage = "A ID do espaço comum é obrigatória.")]
    public Guid EspacoComumId { get; set; }

    [Required(ErrorMessage = "A data e hora de início são obrigatórias.")]
    public DateTime Inicio { get; set; }

    [Required(ErrorMessage = "A data e hora de fim são obrigatórias.")]
    public DateTime Fim { get; set; }

    [StringLength(500, ErrorMessage = "Observações não podem exceder 500 caracteres.")]
    public string? Observacoes { get; set; }

    [Required(ErrorMessage = "É obrigatório aceitar os termos de uso.")]
    public bool TermoDeUsoAceito { get; set; }
}

public class ReservaStatusUpdateDto
{
    [Required(ErrorMessage = "O status da reserva é obrigatório.")]
    [StringLength(50, ErrorMessage = "O status não pode exceder 50 caracteres.")]
    // Ex: "Aprovada", "Recusada", "Pendente"
    // Note: This should ideally be an Enum or a predefined set of strings for consistency.
    // For now, keeping as string as per original structure but referencing ReservaStatus from Entities.
    public string Status { get; set; } = string.Empty; // Consider conViver.Core.Enums.ReservaStatus.ToString()

    [StringLength(500, ErrorMessage = "A justificativa/status não pode exceder 500 caracteres.")]
    public string? JustificativaStatus { get; set; } // Para o síndico ao aprovar/recusar
}

public class ReservaDto
{
    public Guid Id { get; set; }
    public Guid CondominioId { get; set; } // Should this be here or fetched via EspacoComum?
    public Guid UnidadeId { get; set; }
    public string NomeUnidade { get; set; } = string.Empty;
    public Guid UsuarioId { get; set; } // Quem solicitou
    public string NomeUsuarioSolicitante { get; set; } = string.Empty;
    public Guid EspacoComumId { get; set; }
    public string NomeAreaComum { get; set; } = string.Empty;
    public DateTime Inicio { get; set; }
    public DateTime Fim { get; set; }
    public string Status { get; set; } = string.Empty; // Consider conViver.Core.Enums.ReservaStatus.ToString()
    public DateTime DataSolicitacao { get; set; }
    public string? Observacoes { get; set; } // Already existed, ensuring it's nullable
    public Guid? AprovadorId { get; set; }
    public string? NomeAprovador { get; set; }
    public string? JustificativaStatus { get; set; } // Combined field
    public bool TermoDeUsoAceito { get; set; }
    public DateTime? DataCancelamento { get; set; }
    public Guid? CanceladoPorId { get; set; }
    public string? NomeCanceladoPor { get; set; }
}

// DTO para a visualização da agenda
public class AgendaReservaDto
{
    public Guid Id { get; set; }
    public Guid EspacoComumId { get; set; }
    public string NomeAreaComum { get; set; } = string.Empty;
    public DateTime Inicio { get; set; }
    public DateTime Fim { get; set; }
    public string Status { get; set; } = string.Empty; // Consider conViver.Core.Enums.ReservaStatus.ToString()
    public Guid UnidadeId { get; set; }
    public string NomeUnidade { get; set; } = string.Empty;
    public string TituloReserva { get; set; } = string.Empty; // Ex: "Apto 101 - Churrasqueira"
}

public class EspacoComumDto
{
    public Guid Id { get; set; }
    public Guid CondominioId { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string? Descricao { get; set; }
    public int? Capacidade { get; set; }
    public string? FotoUrl { get; set; }
    public bool PermiteReserva { get; set; }
    public bool ExigeAprovacaoAdmin { get; set; }
    public int AntecedenciaMinimaReservaHoras { get; set; }
    public int DuracaoMaximaReservaMinutos { get; set; }
    public int AntecedenciaMinimaCancelamentoHoras { get; set; }
    public int? LimiteReservasPorMesPorUnidade { get; set; }
    public decimal? TaxaReserva { get; set; }
    public string? HorariosPermitidosJson { get; set; } // Consider parsing this into a more structured DTO for client
    public string? DiasBloqueadosJson { get; set; } // Same as above
    public bool ExibirNoMural { get; set; }
    public string? TermoDeUso { get; set; }
    // public RegrasUsoEspacoDto? RegrasFormatadas { get; set; } // Example for future structured rules
}

public class EspacoComumInputDto
{
    [Required(ErrorMessage = "A ID do condomínio é obrigatória.")]
    public Guid CondominioId { get; set; }

    [Required(ErrorMessage = "O nome do espaço comum é obrigatório.")]
    [StringLength(100, ErrorMessage = "O nome não pode exceder 100 caracteres.")]
    public string Nome { get; set; } = string.Empty;

    [StringLength(500, ErrorMessage = "A descrição não pode exceder 500 caracteres.")]
    public string? Descricao { get; set; }

    public int? Capacidade { get; set; }

    [StringLength(2048, ErrorMessage = "A URL da foto não pode exceder 2048 caracteres.")]
    public string? FotoUrl { get; set; }

    public bool PermiteReserva { get; set; } = true;
    public bool ExigeAprovacaoAdmin { get; set; } = false;
    public int AntecedenciaMinimaReservaHoras { get; set; } = 0;
    public int DuracaoMaximaReservaMinutos { get; set; } = 180;
    public int AntecedenciaMinimaCancelamentoHoras { get; set; } = 24;
    public int? LimiteReservasPorMesPorUnidade { get; set; }
    public decimal? TaxaReserva { get; set; }

    [StringLength(1000, ErrorMessage = "As regras de horários permitidos (JSON) não podem exceder 1000 caracteres.")]
    public string? HorariosPermitidosJson { get; set; }

    [StringLength(1000, ErrorMessage = "As regras de dias bloqueados (JSON) não podem exceder 1000 caracteres.")]
    public string? DiasBloqueadosJson { get; set; }
    public bool ExibirNoMural { get; set; } = false;

    [StringLength(2000, ErrorMessage = "O termo de uso não pode exceder 2000 caracteres.")]
    public string? TermoDeUso { get; set; }
}

public class RegrasUsoEspacoDto
{
    public int? LimiteReservasPorMesPorUnidade { get; set; }
    public int AntecedenciaMinimaReservaHoras { get; set; }
    public int DuracaoMaximaReservaMinutos { get; set; }
    public decimal? TaxaReserva { get; set; }
    public string? HorariosPermitidosDisplay { get; set; } // e.g., "Seg-Sex: 09h-18h, Sab: 10h-14h"
    public List<string>? DiasBloqueadosDisplay { get; set; } // e.g., ["Natal", "Ano Novo"]
    public string? TermoDeUso { get; set; }
}

public class MuralReservaDto
{
    public Guid Id { get; set; } // Id da Reserva
    public string NomeAreaComum { get; set; } = string.Empty;
    public string NomeUnidade { get; set; } = string.Empty; // e.g. "Unidade 301" or "João (Apto 301)"
    public DateTime Inicio { get; set; }
    public DateTime Fim { get; set; }
    public string TituloEvento { get; set; } = string.Empty; // Ex: "Salão de Festas reservado por Unidade 301"
}

public class FiltroReservaDto
{
    public Guid? EspacoComumId { get; set; }
    public DateTime? PeriodoInicio { get; set; }
    public DateTime? PeriodoFim { get; set; }
    public string? Status { get; set; } // String to be parsed to ReservaStatus enum in service
    public Guid? UnidadeId { get; set; } // Used in ListarTodasReservasAsync for admin filtering
}
