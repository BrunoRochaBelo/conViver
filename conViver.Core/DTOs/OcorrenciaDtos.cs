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
        public string Titulo { get; set; }
        public string Descricao { get; set; }
        public List<string> Fotos { get; set; }
        public string Status { get; set; }
        public string Tipo { get; set; }
        public DateTime DataOcorrencia { get; set; }
        public DateTime? DataResolucao { get; set; }
        public string? RespostaAdministracao { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class OcorrenciaInputDto
    {
        public string Titulo { get; set; }
        public string Descricao { get; set; }
        public List<string> Fotos { get; set; } = new List<string>();
        public string Tipo { get; set; }
        public DateTime DataOcorrencia { get; set; }
        public Guid? UnidadeId { get; set; }
    }

    public class OcorrenciaUpdateDto
    {
        public string Status { get; set; }
        public string? RespostaAdministracao { get; set; }
    }
}
