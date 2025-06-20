using System;

namespace conViver.Core.Entities
{
    public class OcorrenciaComentario
    {
        public Guid Id { get; set; }
        public Guid OcorrenciaId { get; set; }
        public Guid UsuarioId { get; set; }
        public string Texto { get; set; }
        public DateTime Data { get; set; }

        public Ocorrencia Ocorrencia { get; set; }
        public Usuario Usuario { get; set; } // Assuming Usuario entity exists in conViver.Core.Entities

        // Constructor to initialize non-nullable properties
        public OcorrenciaComentario()
        {
            Texto = string.Empty;
            Ocorrencia = null!; // EF Core will populate this
            Usuario = null!; // EF Core will populate this
        }
    }
}
