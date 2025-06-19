using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using conViver.Core.Enums; // Assuming ReservaStatus is here
// Assuming Usuario entity is in conViver.Core.Entities, otherwise add appropriate using
// using conViver.Core.Entities; // If Usuario is in the same namespace, this might not be needed explicitly for Usuario

namespace conViver.Core.Entities;

public class Reserva
{
    [Key] // Assuming Id is the key
    public Guid Id { get; set; }

    [Required]
    public Guid UnidadeId { get; set; } // Assuming Unidade entity exists and this is a foreign key

    [Required]
    public Guid UsuarioId { get; set; } // ID of the user who made the request

    [ForeignKey("UsuarioId")]
    public virtual Usuario? Solicitante { get; set; }

    [ForeignKey("UnidadeId")]
    public virtual Unidade? Unidade { get; set; }

    [Required]
    public Guid EspacoComumId { get; set; }

    [ForeignKey("EspacoComumId")]
    public virtual EspacoComum? EspacoComum { get; set; }

    [Required]
    public DateTime Inicio { get; set; }

    [Required]
    public DateTime Fim { get; set; }

    [Required]
    public ReservaStatus Status { get; set; } = ReservaStatus.Pendente;

    [Column(TypeName = "decimal(18,2)")] // Good practice for currency/fees
    public decimal? Taxa { get; set; } // This was 'Taxa' in original, matches plan

    [MaxLength(500)]
    public string? Observacoes { get; set; }

    public Guid? AprovadorId { get; set; }

    [ForeignKey("AprovadorId")]
    public virtual Usuario? Aprovador { get; set; }

    [MaxLength(500)]
    public string? JustificativaStatus { get; set; }

    [Required]
    public bool TermoDeUsoAceito { get; set; } = false;

    public DateTime? DataCancelamento { get; set; }

    public Guid? CanceladoPorId { get; set; }

    [ForeignKey("CanceladoPorId")]
    public virtual Usuario? CanceladoPor { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
