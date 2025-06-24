using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace conViver.Core.DTOs;

public class EspacoComumDto
{
    public Guid Id { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string? Descricao { get; set; }
    public int? Capacidade { get; set; }
    public decimal? TaxaReserva { get; set; }
    public string? HorarioFuncionamentoInicio { get; set; }
    public string? HorarioFuncionamentoFim { get; set; }
    public int? TempoMinimoReservaMinutos { get; set; }
    public int? TempoMaximoReservaMinutos { get; set; }
    public int? AntecedenciaMaximaReservaDias { get; set; }
    public int? AntecedenciaMinimaCancelamentoHoras { get; set; }
    public int? LimiteReservasPorUnidadeMes { get; set; }
    public bool RequerAprovacaoSindico { get; set; }
    public bool ExibirNoMural { get; set; }
    // Poderia incluir uma lista de horários já reservados para um dia específico se o DTO for usado nesse contexto.
}
public class ReservaInputDto
{
    // UnidadeId será preenchida pelo backend com base no usuário logado, se não fornecida.
    // Se o síndico estiver criando para outra unidade, ele pode fornecer.
    public Guid? UnidadeId { get; set; }

    [Required(ErrorMessage = "A ID da área comum é obrigatória.")]
    public Guid EspacoComumId { get; set; }

    [Required(ErrorMessage = "A data e hora de início são obrigatórias.")]
    public DateTime Inicio { get; set; }

    [Required(ErrorMessage = "A data e hora de fim são obrigatórias.")]
    // TODO: Adicionar validação para Fim > Inicio
    public DateTime Fim { get; set; }

    [StringLength(500, ErrorMessage = "Observações não podem exceder 500 caracteres.")]
    public string? Observacoes { get; set; }
}

public class ReservaStatusUpdateDto
{
    [Required(ErrorMessage = "O status da reserva é obrigatório.")]
    [StringLength(50, ErrorMessage = "O status não pode exceder 50 caracteres.")]
    // Ex: "Confirmada", "Recusada", "CanceladaPeloUsuario", "CanceladaPeloSindico"
    // Idealmente, usar um Enum aqui e no backend, mas string para flexibilidade se os status mudarem.
    public string Status { get; set; } = string.Empty;

    [StringLength(500, ErrorMessage = "A justificativa não pode exceder 500 caracteres.")]
    public string? Justificativa { get; set; } // Para o síndico ao aprovar/recusar/cancelar
}

public class ReservaDto
{
    public Guid Id { get; set; }
    public Guid CondominioId { get; set; } // Adicionado para contexto, se necessário
    public Guid UnidadeId { get; set; }
    public string? NomeUnidade { get; set; } // Ex: "Apto 101" (requereria join/lookup no service)
    public Guid UsuarioId { get; set; } // Quem solicitou
    public string? NomeUsuarioSolicitante { get; set; } // (requereria join/lookup no service)

    public Guid EspacoComumId { get; set; }
    public string? NomeEspacoComum { get; set; } // (requereria join/lookup no service)

    public DateTime Inicio { get; set; }
    public DateTime Fim { get; set; }
    public string Status { get; set; } = string.Empty; // Ex: Pendente, Confirmada, Recusada, Cancelada
    public DateTime DataSolicitacao { get; set; }
    public decimal? TaxaCobrada { get; set; } // Taxa efetivamente cobrada
    public string? Observacoes { get; set; }

    public Guid? AprovadorId { get; set; } // Síndico ou sistema que aprovou/recusou
    public string? NomeAprovador { get; set; } // (requereria join/lookup no service)
    public string? JustificativaAprovacaoRecusa { get; set; }
    public DateTime UpdatedAt { get; set; } // Para saber a última modificação
}

// DTO para a visualização da agenda (calendário/lista)
public class AgendaReservaDto
{
    public Guid Id { get; set; } // ID da Reserva
    public Guid EspacoComumId { get; set; }
    public string NomeEspacoComum { get; set; } = string.Empty; // Nome do espaço
    public DateTime Inicio { get; set; }
    public DateTime Fim { get; set; }
    public string Status { get; set; } = string.Empty; // Status da reserva
    public Guid UnidadeId { get; set; }
    public string? NomeUnidade { get; set; } // Identificação da unidade, ex: "Bloco A - Apto 101"
    public string TituloReserva { get; set; } = string.Empty; // Um título breve para exibição, ex: "Festa - Apto 101" ou Nome do Espaço
    public bool PertenceAoUsuarioLogado { get; set; } // Para destacar no calendário/lista
}

// DTO para filtros de reserva (usado pelo síndico, por exemplo)
public class ReservaFilterDto
{
    public Guid? EspacoComumId { get; set; }
    public DateTime? PeriodoInicio { get; set; }
    public DateTime? PeriodoFim { get; set; }
    public string? Status { get; set; } // Pendente, Confirmada, Recusada, Cancelada
    public Guid? UnidadeId { get; set; }
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}
