using System;
using System.Collections.Generic;

namespace conViver.Core.DTOs
{
    public class OcorrenciaDto
    {
        public Guid Id { get; set; }
        public Guid CondominioId { get; set; }
        public Guid? UnidadeId { get; set; }
        public Guid UsuarioId { get; set; }
        public string Titulo { get; set; } = string.Empty;
        public string Descricao { get; set; } = string.Empty;
        public List<string> Fotos { get; set; } = new List<string>();
        public string Status { get; set; } = string.Empty;
        public string Tipo { get; set; } = string.Empty;
        public DateTime DataOcorrencia { get; set; }
        public DateTime? DataResolucao { get; set; }
        public string? RespostaAdministracao { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class OcorrenciaInputDto
    {
        public string Titulo { get; set; } = string.Empty;
        public string Descricao { get; set; } = string.Empty;
        public List<string> Fotos { get; set; } = new List<string>(); // Already initialized, but confirm non-nullable requirement
        public string Tipo { get; set; } = string.Empty;
        public DateTime DataOcorrencia { get; set; }
        public Guid? UnidadeId { get; set; }
    }

    public class OcorrenciaUpdateDto
    {
        public string Status { get; set; } = string.Empty;
        public string? RespostaAdministracao { get; set; }
    }
}
