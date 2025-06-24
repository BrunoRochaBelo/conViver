using System; // Necessário para TimeSpan

namespace conViver.Core.Entities;

public class EspacoComum
{
    public Guid Id { get; set; }
    public Guid CondominioId { get; set; } // Já existente
    public string Nome { get; set; } = string.Empty; // Já existente
    public string? Descricao { get; set; } // Já existente
    public decimal? TaxaReserva { get; set; } // Já existente

    // Novos campos conforme plano
    public int? Capacidade { get; set; }

    // Horários de funcionamento (pode ser string como "HH:mm" ou TimeSpan)
    // Usar string para simplicidade inicial, pode ser validado na aplicação/DTO.
    public string? HorarioFuncionamentoInicio { get; set; } // Ex: "08:00"
    public string? HorarioFuncionamentoFim { get; set; }    // Ex: "22:00"

    public int? TempoMinimoReservaMinutos { get; set; } // Em minutos
    public int? TempoMaximoReservaMinutos { get; set; } // Em minutos
    public int? AntecedenciaMaximaReservaDias { get; set; } // Em dias

    // Prazo mínimo para cancelar antes do início da reserva
    public int? AntecedenciaMinimaCancelamentoHoras { get; set; }

    public int? LimiteReservasPorUnidadeMes { get; set; }
    public bool RequerAprovacaoSindico { get; set; } = false;
    public bool ExibirNoMural { get; set; } = false;

    // DiasIndisponiveis será tratado posteriormente ou com entidade separada para manter simples por agora.

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation property para Reservas (um espaço comum pode ter muitas reservas)
    public virtual ICollection<Reserva>? Reservas { get; set; }
}
