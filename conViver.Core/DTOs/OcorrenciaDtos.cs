using System;
using System.Collections.Generic;
using conViver.Core.Enums;

namespace conViver.Core.DTOs
{
    public class PagedResultDto<T>
    {
        public List<T> Items { get; set; } = new List<T>();
        public int TotalCount { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
    }

    public class OcorrenciaInputDto
    {
        public string Titulo { get; set; } = string.Empty;
        public string Descricao { get; set; } = string.Empty;
        public OcorrenciaCategoria Categoria { get; set; }
        public OcorrenciaPrioridade Prioridade { get; set; } = OcorrenciaPrioridade.NORMAL;
    }

    public class OcorrenciaUpdateDto
    {
        public string Titulo { get; set; } = string.Empty;
        public string Descricao { get; set; } = string.Empty;
        public OcorrenciaCategoria Categoria { get; set; }
        public OcorrenciaPrioridade Prioridade { get; set; }
    }

    public class OcorrenciaUsuarioInfoDto
    {
        public Guid Id { get; set; }
        public string Nome { get; set; } = string.Empty;
        public string Unidade { get; set; } = string.Empty;
    }

    public class OcorrenciaAnexoDto
    {
        public Guid Id { get; set; }
        public string Url { get; set; } = string.Empty;
        public string NomeArquivo { get; set; } = string.Empty;
        public string Tipo { get; set; } = string.Empty;
        public long Tamanho { get; set; }
    }

    public class OcorrenciaStatusHistoricoDto
    {
        public string Status { get; set; } = string.Empty;
        public DateTime Data { get; set; }
        public string AlteradoPorNome { get; set; } = string.Empty;
    }

    public class OcorrenciaComentarioDto
    {
        public Guid Id { get; set; }
        public Guid UsuarioId { get; set; }
        public string UsuarioNome { get; set; } = string.Empty;
        public string Texto { get; set; } = string.Empty;
        public DateTime Data { get; set; }
    }

    public class OcorrenciaDetailsDto
    {
        public Guid Id { get; set; }
        public string Titulo { get; set; } = string.Empty;
        public string Descricao { get; set; } = string.Empty;
        public string Categoria { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string Prioridade { get; set; } = string.Empty;
        public DateTime DataAbertura { get; set; }
        public DateTime DataAtualizacao { get; set; }
        public OcorrenciaUsuarioInfoDto Usuario { get; set; } = null!;
        public List<OcorrenciaAnexoDto> Anexos { get; set; } = new List<OcorrenciaAnexoDto>();
        public List<OcorrenciaStatusHistoricoDto> HistoricoStatus { get; set; } = new List<OcorrenciaStatusHistoricoDto>();
        public List<OcorrenciaComentarioDto> Comentarios { get; set; } = new List<OcorrenciaComentarioDto>();
    }

    public class OcorrenciaListItemDto
    {
        public Guid Id { get; set; }
        public string Titulo { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty; // Added this property
        public string Categoria { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string Prioridade { get; set; } = string.Empty;
        public DateTime DataAbertura { get; set; }
        public DateTime DataAtualizacao { get; set; }
        public string NomeUsuario { get; set; } = string.Empty;
    }

    public class OcorrenciaComentarioInputDto
    {
        public string Texto { get; set; } = string.Empty;
    }

    public class OcorrenciaStatusInputDto
    {
        public OcorrenciaStatus Status { get; set; }
    }

    public class OcorrenciaQueryParametersDto
    {
        public OcorrenciaStatus? Status { get; set; }
        public OcorrenciaCategoria? Categoria { get; set; }
        public bool? Minha { get; set; }
        public DateTime? PeriodoInicio { get; set; }
        public DateTime? PeriodoFim { get; set; }
        public int Pagina { get; set; } = 1;
        public int TamanhoPagina { get; set; } = 20;
    }
}
