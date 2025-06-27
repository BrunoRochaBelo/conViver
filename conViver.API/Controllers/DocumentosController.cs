using conViver.Application.Services; // Ajuste o namespace se DocumentoService estiver em outro lugar
using conViver.Core.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations; // Para ValidationException (se usado)
using System.Security.Claims;
using System.Threading.Tasks;

namespace conViver.API.Controllers;

[ApiController]
[Route("/api/v1/docs")] // Conforme API_REFERENCE.md
[Authorize]
public class DocumentosController : ControllerBase
{
    private readonly DocumentoService _documentoService;

    public DocumentosController(DocumentoService documentoService)
    {
        _documentoService = documentoService;
    }

    /// <summary>
    /// Realiza o upload de um novo documento para o condomínio.
    /// </summary>
    /// <param name="file">O arquivo a ser enviado.</param>
    /// <param name="tituloDescritivo">Um título descritivo para o documento (opcional, usa nome do arquivo se não fornecido).</param>
    /// <param name="categoria">Categoria do documento (opcional, padrão "Geral").</param>
    /// <remarks>
    /// Exemplo de requisição usando curl:
    /// curl -X POST "http://localhost:5000/api/v1/syndic/docs" -H "Authorization: Bearer SEU_TOKEN_JWT" -F "file=@/caminho/para/seu/arquivo.pdf" -F "tituloDescritivo=Regulamento Interno 2023" -F "categoria=Regulamentos"
    /// </remarks>
    /// <returns>Os detalhes do documento armazenado.</returns>
    /// <response code="201">Retorna o documento criado.</response>
    /// <response code="400">Se o arquivo não for fornecido, for inválido ou ocorrer um erro durante o processamento.</response>
    /// <response code="401">Usuário não autorizado ou claims não encontradas.</response>
    /// <response code="403">Usuário não tem permissão (não é Síndico).</response>
    [HttpPost("syndic/docs")] // Rota conforme API_REFERENCE.md (POST /api/v1/syndic/docs)
    [Authorize(Roles = "Sindico")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(10 * 1024 * 1024)] // Limite de 10MB para o request (ajustar conforme necessidade)
    public async Task<ActionResult<DocumentoDto>> UploadDocumento(
        [FromForm, Required(ErrorMessage = "O arquivo é obrigatório.")] IFormFile file,
        [FromForm] string? tituloDescritivo,
        [FromForm] string? categoria)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest("Nenhum arquivo enviado ou arquivo vazio.");
        }
        // Validações adicionais no controller podem ser feitas aqui (ex: tamanho máximo específico para IFormFile)
        // if (file.Length > 5 * 1024 * 1024) // Ex: 5MB
        // {
        //     return BadRequest("Arquivo excede o tamanho máximo permitido de 5MB.");
        // }


        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var condominioIdClaim = User.FindFirstValue("condominioId");

        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid usuarioUploadId) ||
            string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("Informações de usuário ou condomínio inválidas no token.");
        }

        try
        {
            var novoDocumentoEntidade = await _documentoService.UploadDocumentoAsync(condominioId, usuarioUploadId, file, tituloDescritivo, categoria);
            var documentoDto = DocumentoService.MapToDocumentoDto(novoDocumentoEntidade);

            // Idealmente, a URL em documentoDto.Url já seria a URL final de download.
            return CreatedAtAction(nameof(ObterDocumentoPorId), new { id = documentoDto.Id }, documentoDto);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (NotImplementedException ex) // Captura se o FileStorageService não estiver pronto
        {
            return StatusCode(StatusCodes.Status501NotImplemented, ex.Message);
        }
        // Outras exceções serão tratadas como 500 Internal Server Error
    }

    /// <summary>
    /// Lista os documentos do condomínio, com filtro opcional por categoria.
    /// </summary>
    /// <param name="categoria">Filtra os documentos por categoria (opcional).</param>
    /// <returns>Uma lista de documentos.</returns>
    /// <response code="200">Retorna a lista de documentos.</response>
    /// <response code="401">Usuário não autorizado ou claim de condomínio não encontrada.</response>
    [HttpGet("app/docs")] // Rota conforme API_REFERENCE.md (GET /api/v1/app/docs)
    [Authorize(Roles = "Sindico,Morador")]
    public async Task<ActionResult<IEnumerable<DocumentoDto>>> ListarDocumentos([FromQuery] string? categoria)
    {
        var condominioIdClaim = User.FindFirstValue("condominioId");
        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("CondominioId não encontrado ou inválido no token.");
        }

        var documentos = await _documentoService.ListarDocumentosAsync(condominioId, categoria);
        return Ok(documentos);
    }

    /// <summary>
    /// Obtém um documento específico pelo ID.
    /// </summary>
    /// <param name="id">ID do documento.</param>
    /// <returns>Os detalhes do documento.</returns>
    /// <response code="200">Retorna o documento.</response>
    /// <response code="401">Usuário não autorizado.</response>
    /// <response code="404">Documento não encontrado.</response>
    [HttpGet("app/docs/{id:guid}")]
    [Authorize(Roles = "Sindico,Morador")]
    public async Task<ActionResult<DocumentoDto>> ObterDocumentoPorId(Guid id)
    {
        var condominioIdClaim = User.FindFirstValue("condominioId");
        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("CondominioId não encontrado ou inválido no token.");
        }

        // Adicionar verificação de usuárioId se necessário para restringir acesso a documentos específicos
        // por usuário não-síndico, mas ObterDocumentoDtoPorIdAsync atualmente não usa usuarioId para filtro.
        // A lógica de acesso pode ser mais refinada no serviço se necessário.

        var documentoDto = await _documentoService.ObterDocumentoDtoPorIdAsync(id, condominioId);

        if (documentoDto == null)
        {
            return NotFound("Documento não encontrado.");
        }

        return Ok(documentoDto);
    }

    /// <summary>
    /// Realiza o download de um documento específico.
    /// </summary>
    /// <param name="id">ID do documento a ser baixado (corresponde ao ID da entidade Documento).</param>
    /// <returns>O arquivo para download.</returns>
    /// <response code="200">Retorna o arquivo.</response>
    /// <response code="401">Usuário não autorizado (se a rota for protegida).</response>
    /// <response code="404">Documento não encontrado ou arquivo físico ausente.</response>
    [HttpGet("download/{id:guid}")] // A rota base do controller é /api/v1/docs
    [Authorize(Roles = "Sindico,Morador")] // Proteger o endpoint de download
    public async Task<IActionResult> DownloadDocumento(Guid id)
    {
        var condominioIdClaim = User.FindFirstValue("condominioId");
        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            // Se o download fosse anônimo, não haveria essa checagem, mas a segurança seria menor.
            // Para downloads anônimos seguros, URLs pré-assinadas de serviços de storage são melhores.
            return Unauthorized("CondominioId não encontrado ou inválido no token para autorizar o download.");
        }

        try
        {
            var (fileContents, contentType, fileName) = await _documentoService.PrepararDownloadDocumentoAsync(id, condominioId);

            if (fileContents == null || contentType == null || fileName == null)
            {
                return NotFound("Documento não encontrado ou arquivo físico indisponível.");
            }

            return File(fileContents, contentType, fileName);
        }
        catch (IOException ex)
        {
            // Logar o erro ex
            return StatusCode(StatusCodes.Status500InternalServerError, $"Erro ao processar o download do arquivo: {ex.Message}");
        }
        catch (NotImplementedException ex)
        {
            return StatusCode(StatusCodes.Status501NotImplemented, ex.Message);
        }
    }

    /// <summary>
    /// Deleta um documento do sistema.
    /// </summary>
    /// <param name="id">ID do documento a ser deletado.</param>
    /// <returns>Nenhum conteúdo se a deleção for bem-sucedida.</returns>
    /// <response code="204">Documento deletado com sucesso.</response>
    /// <response code="401">Usuário não autorizado ou claims não encontradas.</response>
    /// <response code="403">Usuário não tem permissão (não é Síndico).</response>
    /// <response code="404">Documento não encontrado.</response>
    [HttpDelete("syndic/docs/{id:guid}")]
    [Authorize(Roles = "Sindico")]
    public async Task<IActionResult> DeletarDocumento(Guid id)
    {
        var condominioIdClaim = User.FindFirstValue("condominioId");
        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("CondominioId não encontrado ou inválido no token.");
        }

        try
        {
            var sucesso = await _documentoService.DeletarDocumentoAsync(id, condominioId);
            if (!sucesso)
            {
                return NotFound("Documento não encontrado.");
            }
            return NoContent();
        }
        catch (IOException ex)
        {
            // Logar o erro ex
            return StatusCode(StatusCodes.Status500InternalServerError, $"Erro ao tentar deletar o arquivo físico: {ex.Message}");
        }
    }
}
