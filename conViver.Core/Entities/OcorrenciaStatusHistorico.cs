using System;
using conViver.Core.Enums; // Added for OcorrenciaStatus

namespace conViver.Core.Entities
{
    public class OcorrenciaStatusHistorico
    {
        public Guid Id { get; set; }
        public Guid OcorrenciaId { get; set; }
        public OcorrenciaStatus Status { get; set; }
        public Guid AlteradoPorId { get; set; }
        public DateTime Data { get; set; }

        public Ocorrencia Ocorrencia { get; set; }
        public Usuario AlteradoPor { get; set; } // Assuming Usuario entity exists in conViver.Core.Entities

        // Constructor to initialize non-nullable properties
        public OcorrenciaStatusHistorico()
        {
            Ocorrencia = null!; // EF Core will populate this
            AlteradoPor = null!; // EF Core will populate this
        }
    }
}
