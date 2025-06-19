using System;

namespace conViver.Core.Entities;

public class Documento
{
    public Guid Id { get; set; }
    public Guid CondominioId { get; set; }
    public string TituloDescritivo { get; set; } = string.Empty; // Renomeado de Nome
    public string Url { get; set; } = string.Empty;
    public DateTime DataUpload { get; set; } = DateTime.UtcNow; // Renomeado de UploadEm

    public string Categoria { get; set; } = "Geral"; // Adicionado
    public string NomeArquivoOriginal { get; set; } = string.Empty; // Adicionado
    public string TipoArquivo { get; set; } = string.Empty; // Adicionado - MIME Type
    public long TamanhoArquivoBytes { get; set; } // Adicionado
    public Guid UsuarioUploadId { get; set; } // Adicionado

    // Propriedades de auditoria padrão, se diferentes de DataUpload
    // public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    // public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
