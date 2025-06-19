using System;
using System.ComponentModel.DataAnnotations;
// IFormFile é parte do Microsoft.AspNetCore.Http, não pode ser referenciado em Core.
// O DTO DocumentoUploadInputDto é mais um placeholder para os parâmetros [FromForm] no controller.

namespace conViver.Core.DTOs;

/// <summary>
/// DTO para agrupar os parâmetros do formulário de upload de documentos.
/// Os dados do arquivo em si virão de um IFormFile no controller.
/// </summary>
public class DocumentoUploadInputDto
{
    [StringLength(200, ErrorMessage = "O título descritivo não pode exceder 200 caracteres.")]
    public string? TituloDescritivo { get; set; }

    [StringLength(100, ErrorMessage = "A categoria não pode exceder 100 caracteres.")]
    public string? Categoria { get; set; }
}

public class DocumentoDto
{
    public Guid Id { get; set; }
    public string TituloDescritivo { get; set; } = string.Empty;
    public string Categoria { get; set; } = string.Empty;
    public string NomeArquivoOriginal { get; set; } = string.Empty;
    public string TipoArquivo { get; set; } = string.Empty; // MIME Type
    public long TamanhoArquivoBytes { get; set; }
    public string Url { get; set; } = string.Empty; // Para visualização/download
    public DateTime DataUpload { get; set; }
    public Guid UsuarioUploadId { get; set; }
    // Opcional: public string NomeUsuarioUpload { get; set; } (se precisar exibir nome)
}
