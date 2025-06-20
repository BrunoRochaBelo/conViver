using System;
using System.Collections.Generic;
using conViver.Core.Enums;

namespace conViver.Core.DTOs
{
    public class PagedResultDto<T>
    {
        public List<T> Items { get; set; }
        public int TotalCount { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
    }

    public class OcorrenciaInputDto
    {
        public string Titulo { get; set; }
        public string Descricao { get; set; }
        public OcorrenciaCategoria Categoria { get; set; }
        public OcorrenciaPrioridade Prioridade { get; set; } = OcorrenciaPrioridade.NORMAL;
    }

    public class OcorrenciaUpdateDto
    {
        public string Titulo { get; set; }
        public string Descricao { get; set; }
        public OcorrenciaCategoria Categoria { get; set; }
        public OcorrenciaPrioridade Prioridade { get; set; }
    }

    public class OcorrenciaUsuarioInfoDto
    {
        public Guid Id { get; set; }
        public string Nome { get; set; }
        public string Unidade { get; set; }
    }

    public class OcorrenciaAnexoDto
    {
        public Guid Id { get; set; }
        public string Url { get; set; }
        public string NomeArquivo { get; set; }
        public string Tipo { get; set; }
        public long Tamanho { get; set; }
    }

    public class OcorrenciaStatusHistoricoDto
    {
        public string Status { get; set; }
        public DateTime Data { get; set; }
        public string AlteradoPorNome { get; set; }
    }

    public class OcorrenciaComentarioDto
    {
        public Guid Id { get; set; }
        public Guid UsuarioId { get; set; }
        public string UsuarioNome { get; set; }
        public string Texto { get; set; }
        public DateTime Data { get; set; }
    }

    public class OcorrenciaDetailsDto
    {
        public Guid Id { get; set; }
        public string Titulo { get; set; }
        public string Descricao { get; set; }
        public string Categoria { get; set; }
        public string Status { get; set; }
        public string Prioridade { get; set; }
        public DateTime DataAbertura { get; set; }
        public DateTime DataAtualizacao { get; set; }
        public OcorrenciaUsuarioInfoDto Usuario { get; set; }
        public List<OcorrenciaAnexoDto> Anexos { get; set; }
        public List<OcorrenciaStatusHistoricoDto> HistoricoStatus { get; set; }
        public List<OcorrenciaComentarioDto> Comentarios { get; set; }
    }

    public class OcorrenciaListItemDto
    {
        public Guid Id { get; set; }
        public string Titulo { get; set; }
        public string Categoria { get; set; }
        public string Status { get; set; }
        public string Prioridade { get; set; }
        public DateTime DataAbertura { get; set; }
        public DateTime DataAtualizacao { get; set; }
        public string NomeUsuario { get; set; }
    }

    public class OcorrenciaComentarioInputDto
    {
        public string Texto { get; set; }
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

    public class OcorrenciaDto
    {
        public Guid Id { get; set; }
        public Guid CondominioId { get; set; }
        public Guid? UnidadeId { get; set; }
        public Guid UsuarioId { get; set; }
        public string Titulo { get; set; } = string.Empty;
        public string Descricao { get; set; } = string.Empty;
        public List<string> Fotos { get; set; } = new();
        public string Status { get; set; } = string.Empty;
        public string Tipo { get; set; } = string.Empty;
        public DateTime DataOcorrencia { get; set; }
        public DateTime? DataResolucao { get; set; }
        public string? RespostaAdministracao { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
