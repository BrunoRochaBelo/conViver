using System;
using System.Collections.Generic; // Required for ICollection
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace conViver.Core.Entities
{
    public class EspacoComum
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid CondominioId { get; set; } // Foreign key to Condominio

        [Required]
        [MaxLength(100)]
        public string Nome { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Descricao { get; set; }

        public int? Capacidade { get; set; }

        [MaxLength(2048)]
        public string? FotoUrl { get; set; }

        [Required]
        public bool PermiteReserva { get; set; } = true;

        [Required]
        public bool ExigeAprovacaoAdmin { get; set; } = false;

        // Antecedência mínima para reservar em horas
        public int AntecedenciaMinimaReservaHoras { get; set; } = 0;

        // Duração máxima da reserva em minutos
        public int DuracaoMaximaReservaMinutos { get; set; } = 180; // Default 3 hours

        public int AntecedenciaMinimaCancelamentoHoras { get; set; } = 24; // Default 24 hours

        // Limite de reservas por mês por unidade. Nullable se não houver limite.
        public int? LimiteReservasPorMesPorUnidade { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? TaxaReserva { get; set; }

        // JSON string to store complex rules like {"09:00-12:00", "14:00-18:00"}
        // Or specific days: {"Monday": ["09:00-17:00"], "Saturday": ["10:00-14:00"]}
        public string? HorariosPermitidosJson { get; set; }

        // JSON string for blocked dates/periods e.g., ["2023-12-25", "2024-01-01/2024-01-07"]
        public string? DiasBloqueadosJson { get; set; }

        [Required]
        public bool ExibirNoMural { get; set; } = false;

        [MaxLength(2000)]
        public string? TermoDeUso { get; set; }

        // Navigation property for Reserva
        public virtual ICollection<Reserva> Reservas { get; set; } = new List<Reserva>();

        // Foreign key reference to Condominio (assuming Condominio entity exists)
        // [ForeignKey("CondominioId")]
        // public virtual Condominio Condominio { get; set; }
    }
}
