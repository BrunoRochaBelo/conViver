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

        public Usuario Usuario { get; set; }           // Navigation property
        public Unidade Unidade { get; set; }           // Navigation property
        public Condominio Condominio { get; set; }     // Navigation property
        public ICollection<OcorrenciaAnexo> Anexos { get; set; }
        public ICollection<OcorrenciaComentario> Comentarios { get; set; }
        public ICollection<OcorrenciaStatusHistorico> HistoricoStatus { get; set; }
    }
}
