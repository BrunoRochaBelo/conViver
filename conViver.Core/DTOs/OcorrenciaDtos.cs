using System;
using System.Collections.Generic;
using conViver.Core.Enums;
// Assuming IFormFile might be replaced or handled differently, will add a placeholder if needed.
// For now, avoiding direct reference to Microsoft.AspNetCore.Http.Features in Core DTOs.

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
        public string Titulo { get; set; } // Required
        public string Descricao { get; set; } // Required
        public OcorrenciaCategoria Categoria { get; set; } // Required
        public OcorrenciaPrioridade Prioridade { get; set; } = OcorrenciaPrioridade.NORMAL;
        // Anexos will be handled by service method signature for now
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
        public string Unidade { get; set; } // e.g., "301 - Bloco A"
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
        public string Status { get; set; } // Enum to string
        public DateTime Data { get; set; }
        public string AlteradoPorNome { get; set; }
    }

    public class OcorrenciaComentarioDto
    {
        public Guid Id { get; set; }
        public string UsuarioNome { get; set; }
        public Guid UsuarioId { get; set; }
        public string Texto { get; set; }
        public DateTime Data { get; set; }
    }

    public class OcorrenciaDetailsDto
    {
        public Guid Id { get; set; }
        public string Titulo { get; set; }
        public string Descricao { get; set; }
        public string Categoria { get; set; } // Enum to string
        public string Status { get; set; } // Enum to string
        public string Prioridade { get; set; } // Enum to string
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
        public string Categoria { get; set; } // Enum to string
        public string Status { get; set; } // Enum to string
        public DateTime DataAbertura { get; set; }
        public DateTime DataAtualizacao { get; set; }
        public string Prioridade { get; set; } // Enum to string
        public string NomeUsuario { get; set; }
    }

    public class OcorrenciaComentarioInputDto
    {
        public string Texto { get; set; } // Required
    }

    public class OcorrenciaStatusInputDto
    {
        public OcorrenciaStatus Status { get; set; } // Required
    }

    public class OcorrenciaQueryParametersDto
    {
        public OcorrenciaStatus? Status { get; set; }
        public OcorrenciaCategoria? Categoria { get; set; }
        public bool? Minha { get; set; } // True to filter by current user's Ocorrencias
        public DateTime? PeriodoInicio { get; set; }
        public DateTime? PeriodoFim { get; set; }
        public int Pagina { get; set; } = 1;
        public int TamanhoPagina { get; set; } = 20;
    }
}
