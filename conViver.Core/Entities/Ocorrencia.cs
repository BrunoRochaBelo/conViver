using System;
using System.Collections.Generic;
using conViver.Core.Enums;

namespace conViver.Core.Entities
{
    public class Ocorrencia
    {
        public Guid Id { get; set; }
        public string Titulo { get; set; }
        public string Descricao { get; set; }
        public OcorrenciaCategoria Categoria { get; set; }
        public OcorrenciaStatus Status { get; set; }
        public OcorrenciaPrioridade Prioridade { get; set; }
        public DateTime DataAbertura { get; set; }
        public DateTime DataAtualizacao { get; set; }
        public Guid UsuarioId { get; set; }
        public Guid? UnidadeId { get; set; }
        public Guid CondominioId { get; set; }

        public Usuario Usuario { get; set; }
        public Unidade? Unidade { get; set; } // Made Unidade nullable
        public Condominio Condominio { get; set; }

        public ICollection<OcorrenciaAnexo> Anexos { get; set; }
        public ICollection<OcorrenciaComentario> Comentarios { get; set; }
        public ICollection<OcorrenciaStatusHistorico> HistoricoStatus { get; set; }

        // Constructor to initialize non-nullable properties
        public Ocorrencia()
        {
            Titulo = string.Empty;
            Descricao = string.Empty;
            Usuario = null!; // EF Core will populate this
            // Unidade is nullable, no need to initialize to null!
            Condominio = null!; // EF Core will populate this
            Anexos = new List<OcorrenciaAnexo>();
            Comentarios = new List<OcorrenciaComentario>();
            HistoricoStatus = new List<OcorrenciaStatusHistorico>();
        }
    }
}
