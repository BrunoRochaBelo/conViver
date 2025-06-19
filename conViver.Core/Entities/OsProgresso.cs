using System;

namespace conViver.Core.Entities
{
    public class OsProgresso
    {
        public Guid Id { get; set; }
        public Guid OrdemServicoId { get; set; } // Foreign Key to OrdemServico
        public virtual OrdemServico? OrdemServico { get; set; } // Navigation property
        public DateTime Data { get; set; }
        public Guid UsuarioId { get; set; } // ID of the user or prestador who performed the action
        public string NomeUsuarioCache { get; set; } = string.Empty; // Name of the user/prestador at the time of logging
        public string? Descricao { get; set; } // General description of the event
        public string? StatusAntigo { get; set; } // Nullable, for status changes
        public string? StatusNovo { get; set; } // Nullable, for status changes
        public string? Observacao { get; set; } // Detailed text, e.g., comments, reasons

        public OsProgresso()
        {
            Id = Guid.NewGuid();
            Data = DateTime.UtcNow;
        }
    }
}
