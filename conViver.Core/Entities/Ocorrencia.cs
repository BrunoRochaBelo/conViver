using System;
using System.Collections.Generic;

namespace conViver.Core.Entities
{
    public class Ocorrencia
    {
        public Guid Id { get; set; }
        public Guid CondominioId { get; set; }
        public Guid? UnidadeId { get; set; }
        public Guid UsuarioId { get; set; }
        public string Titulo { get; set; } = string.Empty;
        public string Descricao { get; set; } = string.Empty;
        public List<string> Fotos { get; set; } = new List<string>();
        public string Status { get; set; } = string.Empty; // e.g., "Registrada", "EmAnalise", "Resolvida", "Cancelada"
        public string Tipo { get; set; } = string.Empty; // e.g., "Barulho", "Seguranca", "Infraestrutura", "Outros"
        public DateTime DataOcorrencia { get; set; } // Date the event happened
        public DateTime? DataResolucao { get; set; }
        public string? RespostaAdministracao { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
