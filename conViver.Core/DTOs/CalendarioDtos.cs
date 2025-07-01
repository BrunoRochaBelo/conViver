using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace conViver.Core.DTOs;

public class EspacoComumDto // Mantido, pois é uma entidade relacionada mas distinta
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
    public string? DiasIndisponiveis { get; set; }
    public bool PermiteVisualizacaoPublicaDetalhes { get; set; }
}
public class CalendarioItemInputDto // Renomeado de ReservaInputDto
{
    public Guid? UnidadeId { get; set; }

    [Required(ErrorMessage = "A ID da área comum é obrigatória.")]
    public Guid EspacoComumId { get; set; }

    [Required(ErrorMessage = "A data e hora de início são obrigatórias.")]
    public DateTime Inicio { get; set; }

    [Required(ErrorMessage = "A data e hora de fim são obrigatórias.")]
    public DateTime Fim { get; set; }

    [StringLength(500, ErrorMessage = "Observações não podem exceder 500 caracteres.")]
    public string? Observacoes { get; set; }

    [StringLength(150, ErrorMessage = "Título para o mural não pode exceder 150 caracteres.")]
    public string? TituloParaMural { get; set; }
    public string? TipoItem { get; set; } // "Reserva", "Evento", "Manutencao", "Servico", "Reuniao"

    // Campos adicionais para eventos, serviços, etc. podem ser adicionados aqui
    // Ex: public string? LocalizacaoAlternativa { get; set; } // Se não for EspacoComum
}

public class CalendarioItemStatusUpdateDto // Renomeado de ReservaStatusUpdateDto
{
    [Required(ErrorMessage = "O status do item do calendário é obrigatório.")]
    [StringLength(50, ErrorMessage = "O status não pode exceder 50 caracteres.")]
    public string Status { get; set; } = string.Empty;

    [StringLength(500, ErrorMessage = "A justificativa não pode exceder 500 caracteres.")]
    public string? Justificativa { get; set; }
}

public class CalendarioItemDto // Renomeado de ReservaDto
{
    public Guid Id { get; set; }
    public Guid CondominioId { get; set; }
    public Guid UnidadeId { get; set; }
    public string? NomeUnidade { get; set; }
    public Guid UsuarioId { get; set; }
    public string? NomeUsuarioSolicitante { get; set; }

    public Guid EspacoComumId { get; set; }
    public string? NomeEspacoComum { get; set; }

    public DateTime Inicio { get; set; }
    public DateTime Fim { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime DataSolicitacao { get; set; } // Ou DataCriacao para itens gerais
    public decimal? TaxaCobrada { get; set; }
    public string? Observacoes { get; set; }
    public string? TituloParaMural { get; set; }

    public Guid? AprovadorId { get; set; }
    public string? NomeAprovador { get; set; }
    public string? JustificativaAprovacaoRecusa { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? TipoItem { get; set; } // "Reserva", "Evento", "Manutencao", "Servico", "Reuniao"


    // Campos adicionais para eventos, etc.
    // Ex: public string? DescricaoCompleta { get; set; } // Para eventos
}

// DTO para a visualização da agenda (calendário/lista)
public class AgendaCalendarioItemDto // Renomeado de AgendaReservaDto
{
    public Guid Id { get; set; } // ID do Item do Calendário
    public Guid EspacoComumId { get; set; } // Pode ser nulo se for um evento sem espaço específico
    public string NomeEspacoComum { get; set; } = string.Empty; // Nome do espaço ou título do evento
    public DateTime Inicio { get; set; }
    public DateTime Fim { get; set; }
    public string Status { get; set; } = string.Empty;
    public Guid? UnidadeId { get; set; } // Pode ser nulo para eventos gerais
    public string? NomeUnidade { get; set; }
    public string TituloItem { get; set; } = string.Empty; // Título para exibição (Reserva, Evento, etc.)
    public bool PertenceAoUsuarioLogado { get; set; }
    public bool PermiteVisualizacaoPublicaDetalhes { get; set; }
    public string TipoItem { get; set; } = "Reserva"; // "Reserva", "Evento", "Manutencao", "Servico"
    public string? CorDoEvento { get; set; } // Para diferenciar tipos de item no calendário
}

// DTO para filtros de itens do calendário
public class CalendarioItemFilterDto // Renomeado de ReservaFilterDto
{
    public Guid? EspacoComumId { get; set; }
    public DateTime? PeriodoInicio { get; set; }
    public DateTime? PeriodoFim { get; set; }
    public string? Status { get; set; }
    public Guid? UnidadeId { get; set; }
    public string? TipoItem { get; set; } // Para filtrar por "Reserva", "Evento", etc.
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}

// DTO para itens do calendário no Mural Digital
public class CalendarioMuralDto // Renomeado de ReservaMuralDto
{
    public Guid IdItemCalendario { get; set; } // Renomeado de IdReserva
    public string NomeEspacoComumOuTitulo { get; set; } = string.Empty; // Generalizado
    public string? NomeUnidade { get; set; }
    public DateTime DataInicio { get; set; }
    public string HoraInicio { get; set; } = string.Empty;
    public string HoraFim { get; set; } = string.Empty;
    public string? TituloCustomizado { get; set; }
    public string TituloGerado { get; set; } = string.Empty;
    public string UrlDetalhes { get; set; } = string.Empty;
    public string TipoItem { get; set; } = "Reserva"; // Para dar contexto no mural
}
