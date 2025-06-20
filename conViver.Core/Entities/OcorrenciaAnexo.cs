using System;

namespace conViver.Core.Entities
{
    public class OcorrenciaAnexo
    {
        public Guid Id { get; set; }
        public Guid OcorrenciaId { get; set; }
        public string Url { get; set; }
        public string NomeArquivo { get; set; }
        public string Tipo { get; set; }
        public long Tamanho { get; set; }

        public Ocorrencia Ocorrencia { get; set; }

        // Constructor to initialize non-nullable properties
        public OcorrenciaAnexo()
        {
            Url = string.Empty;
            NomeArquivo = string.Empty;
            Tipo = string.Empty;
            Ocorrencia = null!; // EF Core will populate this
        }
    }
}
