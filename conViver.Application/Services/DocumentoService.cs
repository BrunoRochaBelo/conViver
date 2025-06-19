using conViver.Core.Entities;
using conViver.Core.Interfaces;
using conViver.Core.DTOs; // Para DocumentoDto, DocumentoUploadInputDto não é usado diretamente aqui
using Microsoft.AspNetCore.Http; // Para IFormFile
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.IO; // Para Path.GetExtension
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace conViver.Application.Services;

// Interface para o serviço de armazenamento de arquivos (a ser implementado futuramente)
public interface IFileStorageService
{
    Task<string> SaveFileAsync(IFormFile file, string uniqueFileName, string containerName = "documentos");
    // Task<byte[]> GetFileAsync(string uniqueFileName, string containerName = "documentos");
    // Task DeleteFileAsync(string uniqueFileName, string containerName = "documentos");
}

public class DocumentoService
{
    private readonly IRepository<Documento> _documentoRepository;
    private readonly IFileStorageService? _fileStorageService; // Opcional por enquanto
    private readonly string _baseStoragePath; // Para simulação de armazenamento local

    // Construtor para quando IFileStorageService não estiver implementado
    public DocumentoService(IRepository<Documento> documentoRepository)
    {
        _documentoRepository = documentoRepository;
        _fileStorageService = null; // Explicitamente nulo
        // Define um caminho base para os uploads simulados. Cuidado com permissões de escrita em produção.
        // Idealmente, este caminho viria de uma configuração.
        _baseStoragePath = Path.Combine(Directory.GetCurrentDirectory(), "FileUploads", "DocumentosBiblioteca");
        // Garante que o diretório base exista
        Directory.CreateDirectory(_baseStoragePath);
    }

    // Construtor para quando IFileStorageService estiver implementado (descomentar)
    // public DocumentoService(IRepository<Documento> documentoRepository, IFileStorageService fileStorageService)
    // {
    //     _documentoRepository = documentoRepository;
    //     _fileStorageService = fileStorageService;
    //     _baseStoragePath = Path.Combine(Directory.GetCurrentDirectory(), "FileUploads", "DocumentosBiblioteca");
    //     Directory.CreateDirectory(_baseStoragePath);
    // }

    public async Task<Documento> UploadDocumentoAsync(
        Guid condominioId,
        Guid usuarioUploadId,
        IFormFile arquivo,
        string? tituloDescritivo,
        string? categoria,
        CancellationToken ct = default)
    {
        if (arquivo == null || arquivo.Length == 0)
        {
            throw new ArgumentException("Arquivo inválido ou vazio.", nameof(arquivo));
        }

        var nomeArquivoOriginal = Path.GetFileName(arquivo.FileName);
        var tipoArquivo = arquivo.ContentType;
        var tamanhoArquivoBytes = arquivo.Length;
        var extensaoArquivo = Path.GetExtension(nomeArquivoOriginal);

        var documento = new Documento
        {
            Id = Guid.NewGuid(), // Gera o ID da entidade primeiro
            CondominioId = condominioId,
            UsuarioUploadId = usuarioUploadId,
            TituloDescritivo = string.IsNullOrWhiteSpace(tituloDescritivo) ? nomeArquivoOriginal : tituloDescritivo,
            Categoria = string.IsNullOrWhiteSpace(categoria) ? "Geral" : categoria,
            NomeArquivoOriginal = nomeArquivoOriginal,
            TipoArquivo = tipoArquivo,
            TamanhoArquivoBytes = tamanhoArquivoBytes,
            DataUpload = DateTime.UtcNow,
            // A URL será padronizada para o endpoint de download com o ID do documento.
            Url = $"/api/v1/docs/download/{Guid.NewGuid()}" // Placeholder, será atualizado abaixo
        };
        documento.Url = $"/api/v1/docs/download/{documento.Id}";


        if (_fileStorageService != null)
        {
            // Lógica de armazenamento real (futuro)
            // string nomeArquivoStorage = documento.Id.ToString() + extensaoArquivo;
            // await _fileStorageService.SaveFileAsync(arquivo, nomeArquivoStorage, $"documentos-condominio-{condominioId}");
            // documento.Url = ... ; // URL retornada pelo serviço de storage, ou construída
            throw new NotImplementedException("IFileStorageService não está configurado para uso real.");
        }
        else
        {
            // Simulação de armazenamento local
            var diretorioCondominio = Path.Combine(_baseStoragePath, condominioId.ToString());
            Directory.CreateDirectory(diretorioCondominio); // Garante que o diretório do condomínio exista

            // Usa o ID do Documento como nome do arquivo para garantir unicidade e fácil recuperação
            var nomeArquivoStorage = documento.Id.ToString() + extensaoArquivo;
            var caminhoCompletoArquivo = Path.Combine(diretorioCondominio, nomeArquivoStorage);

            try
            {
                using (var stream = new FileStream(caminhoCompletoArquivo, FileMode.Create))
                {
                    await arquivo.CopyToAsync(stream, ct);
                }
                // Opcional: poderia armazenar 'nomeArquivoStorage' ou 'caminhoCompletoArquivo' (relativo)
                // na entidade Documento se a lógica de reconstrução do caminho fosse complexa
                // ou se o nome do arquivo no storage não fosse diretamente o ID.
            }
            catch (Exception ex)
            {
                // Logar o erro
                throw new IOException($"Erro ao salvar o arquivo simulado: {ex.Message}", ex);
            }
        }

        await _documentoRepository.AddAsync(documento, ct);
        await _documentoRepository.SaveChangesAsync(ct);

        return documento;
    }

    public async Task<IEnumerable<DocumentoDto>> ListarDocumentosAsync(Guid condominioId, string? categoria, CancellationToken ct = default)
    {
        var query = _documentoRepository.Query()
            .Where(d => d.CondominioId == condominioId);

        if (!string.IsNullOrEmpty(categoria))
        {
            query = query.Where(d => d.Categoria.ToLower() == categoria.ToLower());
        }

        return await query
            .OrderByDescending(d => d.DataUpload)
            .Select(d => new DocumentoDto // Mapeamento manual
            {
                Id = d.Id,
                TituloDescritivo = d.TituloDescritivo,
                Categoria = d.Categoria,
                NomeArquivoOriginal = d.NomeArquivoOriginal,
                TipoArquivo = d.TipoArquivo,
                TamanhoArquivoBytes = d.TamanhoArquivoBytes,
                Url = d.Url,
                DataUpload = d.DataUpload,
                UsuarioUploadId = d.UsuarioUploadId
            })
            .ToListAsync(ct);
    }

    // Método auxiliar para mapear Documento para DocumentoDto
    public static DocumentoDto MapToDocumentoDto(Documento documento)
    {
        return new DocumentoDto
        {
            Id = documento.Id,
            TituloDescritivo = documento.TituloDescritivo,
            Categoria = documento.Categoria,
            NomeArquivoOriginal = documento.NomeArquivoOriginal,
            TipoArquivo = documento.TipoArquivo,
            TamanhoArquivoBytes = documento.TamanhoArquivoBytes,
            Url = documento.Url,
            DataUpload = documento.DataUpload,
            UsuarioUploadId = documento.UsuarioUploadId
        };
    }

    public async Task<DocumentoDto?> ObterDocumentoDtoPorIdAsync(Guid id, Guid condominioId, CancellationToken ct = default)
    {
        var documento = await _documentoRepository.Query()
            .FirstOrDefaultAsync(d => d.Id == id && d.CondominioId == condominioId, ct);

        if (documento == null)
        {
            return null;
        }
        return MapToDocumentoDto(documento);
    }

    public async Task<(byte[]? FileContents, string? ContentType, string? FileName)> PrepararDownloadDocumentoAsync(Guid id, Guid condominioId, CancellationToken ct = default)
    {
        var documento = await _documentoRepository.Query()
            .FirstOrDefaultAsync(d => d.Id == id && d.CondominioId == condominioId, ct);

        if (documento == null)
        {
            return (null, null, null);
        }

        if (_fileStorageService != null)
        {
            // Lógica de download real (futuro)
            // string nomeArquivoStorage = documento.Id.ToString() + Path.GetExtension(documento.NomeArquivoOriginal);
            // var fileBytes = await _fileStorageService.GetFileAsync(nomeArquivoStorage, $"documentos-condominio-{condominioId}");
            // return (fileBytes, documento.TipoArquivo, documento.NomeArquivoOriginal);
            throw new NotImplementedException("IFileStorageService não está configurado para uso real.");
        }
        else
        {
            // Simulação de leitura do arquivo local
            var extensaoArquivo = Path.GetExtension(documento.NomeArquivoOriginal);
            var nomeArquivoStorage = documento.Id.ToString() + extensaoArquivo;
            var caminhoCompletoArquivo = Path.Combine(_baseStoragePath, condominioId.ToString(), nomeArquivoStorage);

            if (File.Exists(caminhoCompletoArquivo))
            {
                try
                {
                    var fileBytes = await File.ReadAllBytesAsync(caminhoCompletoArquivo, ct);
                    return (fileBytes, documento.TipoArquivo, documento.NomeArquivoOriginal);
                }
                catch (Exception ex)
                {
                    // Logar o erro
                    throw new IOException($"Erro ao ler o arquivo simulado: {ex.Message}", ex);
                }
            }
            else
            {
                // Arquivo não encontrado no sistema de arquivos (pode indicar um problema de sincronia ou erro no upload)
                // Logar este cenário é importante.
                // Poderia retornar um array de bytes de exemplo para fins de teste, mas é melhor simular o erro.
                // return (System.Text.Encoding.UTF8.GetBytes("Arquivo de exemplo não encontrado fisicamente."), "text/plain", "erro.txt");
                return (null, null, null); // Indica que o arquivo não foi encontrado
            }
        }
    }

    public async Task<bool> DeletarDocumentoAsync(Guid id, Guid condominioId, CancellationToken ct = default)
    {
        var documento = await _documentoRepository.Query()
            .FirstOrDefaultAsync(d => d.Id == id && d.CondominioId == condominioId, ct);

        if (documento == null)
        {
            return false;
        }

        if (_fileStorageService != null)
        {
            // Lógica de deleção real (futuro)
            // string nomeArquivoStorage = documento.Id.ToString() + Path.GetExtension(documento.NomeArquivoOriginal);
            // await _fileStorageService.DeleteFileAsync(nomeArquivoStorage, $"documentos-condominio-{condominioId}");
            throw new NotImplementedException("IFileStorageService não está configurado para uso real.");
        }
        else
        {
            // Simulação de deleção do arquivo local
            var extensaoArquivo = Path.GetExtension(documento.NomeArquivoOriginal);
            var nomeArquivoStorage = documento.Id.ToString() + extensaoArquivo;
            var caminhoCompletoArquivo = Path.Combine(_baseStoragePath, condominioId.ToString(), nomeArquivoStorage);

            try
            {
                if (File.Exists(caminhoCompletoArquivo))
                {
                    File.Delete(caminhoCompletoArquivo);
                }
                // Se o arquivo não existir, não há problema, apenas removemos a referência do banco.
            }
            catch (Exception ex)
            {
                // Logar o erro, mas prosseguir para remover a referência do banco.
                // Em um cenário real, pode-se querer uma transação ou compensação aqui.
                // Console.WriteLine($"Erro ao deletar arquivo físico (simulado): {ex.Message}");
                throw new IOException($"Erro ao deletar o arquivo simulado: {ex.Message}. A entrada no banco será removida.", ex);
            }
        }

        await _documentoRepository.DeleteAsync(documento, ct);
        await _documentoRepository.SaveChangesAsync(ct);
        return true;
    }
}
