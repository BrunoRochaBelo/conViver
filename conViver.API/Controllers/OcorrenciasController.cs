using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using conViver.Core.DTOs;
using conViver.Core.Interfaces;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace conViver.API.Controllers
{
    [Route("api/ocorrencias")]
    [ApiController]
    [Authorize] // Default authorization for all methods unless overridden
    public class OcorrenciasController : ControllerBase
    {
        private readonly IOcorrenciaService _ocorrenciaService;
        private readonly ILogger<OcorrenciasController> _logger;

        public OcorrenciasController(IOcorrenciaService ocorrenciaService, ILogger<OcorrenciasController> logger)
        {
            _ocorrenciaService = ocorrenciaService;
            _logger = logger;
        }

        private Guid GetUserId()
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
            {
                throw new UnauthorizedAccessException("ID de usuário não encontrado ou inválido no token.");
            }
            return userId;
        }

        private bool IsAdminOrSindico()
        {
            // Assuming role names are "Administrador" and "Sindico"
            return User.IsInRole("Administrador") || User.IsInRole("Sindico");
        }

        // POST /api/ocorrencias
        [HttpPost]
        [Authorize(Roles = "Morador,Sindico,Administrador")] // Assuming these roles can create
        public async Task<IActionResult> CreateOcorrencia([FromForm] OcorrenciaInputDto ocorrenciaDto, List<IFormFile> anexos)
        {
            try
            {
                var userId = GetUserId();
                var anexoInputs = new List<AnexoInput>();

                if (anexos != null)
                {
                    foreach (var file in anexos)
                    {
                        if (file.Length > 0)
                        {
                            // Important: IFormFile.OpenReadStream() returns a stream that should be disposed.
                            // The service layer (especially the storage service) should handle stream disposal.
                            anexoInputs.Add(new AnexoInput(file.FileName, file.ContentType, file.OpenReadStream()));
                        }
                    }
                }

                var createdOcorrencia = await _ocorrenciaService.CreateOcorrenciaAsync(ocorrenciaDto, userId, anexoInputs);
                return CreatedAtAction(nameof(GetOcorrenciaById), new { id = createdOcorrencia.Id }, createdOcorrencia);
            }
            catch (ValidationException vex)
            {
                _logger.LogWarning(vex, "Erro de validação ao criar ocorrência.");
                return BadRequest(new { errors = vex.Errors.Select(e => new { e.PropertyName, e.ErrorMessage }) });
            }
            catch (KeyNotFoundException knfex)
            {
                _logger.LogWarning(knfex, "Recurso não encontrado ao criar ocorrência (ex: usuário).");
                return NotFound(new { message = knfex.Message });
            }
            catch (UnauthorizedAccessException uex)
            {
                _logger.LogWarning(uex, "Acesso não autorizado.");
                return Unauthorized(new { message = uex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro inesperado ao criar ocorrência.");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Ocorreu um erro interno." });
            }
        }

        // GET /api/ocorrencias/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetOcorrenciaById(Guid id)
        {
            try
            {
                var userId = GetUserId(); // Used for permission checks within the service if implemented there
                var ocorrencia = await _ocorrenciaService.GetOcorrenciaByIdAsync(id, userId);
                return Ok(ocorrencia);
            }
            catch (KeyNotFoundException knfex)
            {
                _logger.LogWarning(knfex, $"Ocorrência com ID {id} não encontrada.");
                return NotFound(new { message = knfex.Message });
            }
            catch (UnauthorizedAccessException uex)
            {
                _logger.LogWarning(uex, "Acesso não autorizado para ocorrência ID {OcorrenciaId}.", id);
                return Unauthorized(new { message = uex.Message });
            }
            // catch (ForbiddenException fex) // If service throws this for permissions
            // {
            //     _logger.LogWarning(fex, "Acesso proibido para ocorrência ID {OcorrenciaId}.", id);
            //     return Forbid(fex.Message);
            // }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Erro inesperado ao buscar ocorrência ID {id}.");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Ocorreu um erro interno." });
            }
        }

        // GET /api/ocorrencias
        [HttpGet]
        public async Task<IActionResult> GetOcorrencias([FromQuery] OcorrenciaQueryParametersDto queryParams)
        {
            try
            {
                var userId = GetUserId();
                var isAdminOrSindicoUser = IsAdminOrSindico();
                var result = await _ocorrenciaService.GetOcorrenciasAsync(queryParams, userId, isAdminOrSindicoUser);
                return Ok(result);
            }
            catch (UnauthorizedAccessException uex)
            {
                _logger.LogWarning(uex, "Acesso não autorizado ao listar ocorrências.");
                return Unauthorized(new { message = uex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro inesperado ao listar ocorrências.");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Ocorreu um erro interno." });
            }
        }

        // POST /api/ocorrencias/{id}/comentarios
        [HttpPost("{id}/comentarios")]
        public async Task<IActionResult> AddComentario(Guid id, [FromBody] OcorrenciaComentarioInputDto comentarioDto)
        {
            try
            {
                var userId = GetUserId();
                var comentarioResult = await _ocorrenciaService.AddComentarioAsync(id, comentarioDto, userId);
                return Ok(comentarioResult);
            }
            catch (ValidationException vex)
            {
                _logger.LogWarning(vex, "Erro de validação ao adicionar comentário na ocorrência ID {OcorrenciaId}.", id);
                return BadRequest(new { errors = vex.Errors.Select(e => new { e.PropertyName, e.ErrorMessage }) });
            }
            catch (KeyNotFoundException knfex)
            {
                _logger.LogWarning(knfex, $"Recurso não encontrado ao adicionar comentário na ocorrência ID {id}.");
                return NotFound(new { message = knfex.Message });
            }
            catch (UnauthorizedAccessException uex)
            {
                _logger.LogWarning(uex, "Acesso não autorizado para comentar na ocorrência ID {OcorrenciaId}.", id);
                return Unauthorized(new { message = uex.Message });
            }
            // catch (ForbiddenException fex)
            // {
            //     _logger.LogWarning(fex, "Acesso proibido para comentar na ocorrência ID {OcorrenciaId}.", id);
            //     return Forbid(fex.Message);
            // }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Erro inesperado ao adicionar comentário na ocorrência ID {id}.");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Ocorreu um erro interno." });
            }
        }

        // POST /api/ocorrencias/{id}/status
        [HttpPost("{id}/status")]
        [Authorize(Roles = "Sindico,Administrador")]
        public async Task<IActionResult> ChangeOcorrenciaStatus(Guid id, [FromBody] OcorrenciaStatusInputDto statusDto)
        {
            try
            {
                var userId = GetUserId();
                var success = await _ocorrenciaService.ChangeOcorrenciaStatusAsync(id, statusDto, userId);
                if (success)
                {
                    return Ok(new { message = "Status da ocorrência alterado com sucesso." });
                }
                // This part might not be reached if service throws exceptions for failures
                return BadRequest(new { message = "Não foi possível alterar o status da ocorrência." });
            }
            catch (ValidationException vex)
            {
                _logger.LogWarning(vex, "Erro de validação ao alterar status da ocorrência ID {OcorrenciaId}.", id);
                return BadRequest(new { errors = vex.Errors.Select(e => new { e.PropertyName, e.ErrorMessage }) });
            }
            catch (KeyNotFoundException knfex)
            {
                _logger.LogWarning(knfex, $"Recurso não encontrado ao alterar status da ocorrência ID {id}.");
                return NotFound(new { message = knfex.Message });
            }
            catch (UnauthorizedAccessException uex) // Should be caught by [Authorize] but good for service layer checks
            {
                _logger.LogWarning(uex, "Acesso não autorizado para alterar status da ocorrência ID {OcorrenciaId}.", id);
                return Unauthorized(new { message = uex.Message });
            }
            // catch (ForbiddenException fex)
            // {
            //     _logger.LogWarning(fex, "Acesso proibido para alterar status da ocorrência ID {OcorrenciaId}.", id);
            //     return Forbid(fex.Message);
            // }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Erro inesperado ao alterar status da ocorrência ID {id}.");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Ocorreu um erro interno." });
            }
        }

        // POST /api/ocorrencias/{id}/anexos
        [HttpPost("{id}/anexos")]
        public async Task<IActionResult> AddAnexos(Guid id, List<IFormFile> anexos)
        {
            if (anexos == null || !anexos.Any())
            {
                return BadRequest(new { message = "Nenhum anexo fornecido." });
            }

            try
            {
                var userId = GetUserId();
                var anexoInputs = new List<AnexoInput>();
                foreach (var file in anexos)
                {
                    if (file.Length > 0)
                    {
                        anexoInputs.Add(new AnexoInput(file.FileName, file.ContentType, file.OpenReadStream()));
                    }
                }

                if (!anexoInputs.Any())
                {
                     return BadRequest(new { message = "Nenhum anexo válido fornecido (ex: arquivos vazios)." });
                }

                await _ocorrenciaService.AddAnexosAsync(id, anexoInputs, userId);
                return Ok(new { message = "Anexos adicionados com sucesso." });
            }
            catch (KeyNotFoundException knfex)
            {
                _logger.LogWarning(knfex, $"Recurso não encontrado ao adicionar anexos à ocorrência ID {id}.");
                return NotFound(new { message = knfex.Message });
            }
            catch (UnauthorizedAccessException uex)
            {
                _logger.LogWarning(uex, "Acesso não autorizado para adicionar anexos à ocorrência ID {OcorrenciaId}.", id);
                return Unauthorized(new { message = uex.Message });
            }
            // catch (ForbiddenException fex)
            // {
            //     _logger.LogWarning(fex, "Acesso proibido para adicionar anexos à ocorrência ID {OcorrenciaId}.", id);
            //     return Forbid(fex.Message);
            // }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Erro inesperado ao adicionar anexos à ocorrência ID {id}.");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Ocorreu um erro interno." });
            }
        }

        // GET /api/ocorrencias/{id}/historico-status
        [HttpGet("{id}/historico-status")]
        public async Task<IActionResult> GetStatusHistorico(Guid id)
        {
            try
            {
                // Permissions might be tied to GetOcorrenciaById, or could be open if user can see occurrence
                var historico = await _ocorrenciaService.GetStatusHistoricoAsync(id);
                return Ok(historico);
            }
            catch (KeyNotFoundException knfex) // If service checks if Ocorrencia exists first
            {
                _logger.LogWarning(knfex, $"Ocorrência ID {id} não encontrada ao buscar histórico de status.");
                return NotFound(new { message = knfex.Message });
            }
            catch (UnauthorizedAccessException uex)
            {
                _logger.LogWarning(uex, "Acesso não autorizado para histórico da ocorrência ID {OcorrenciaId}.", id);
                return Unauthorized(new { message = uex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Erro inesperado ao buscar histórico de status para ocorrência ID {id}.");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Ocorreu um erro interno." });
            }
        }

        // DELETE /api/ocorrencias/{id}
        [HttpDelete("{id}")]
        [Authorize(Roles = "Sindico,Administrador")]
        public async Task<IActionResult> DeleteOcorrencia(Guid id)
        {
            try
            {
                var userId = GetUserId(); // For logging or if service needs it for some reason
                var success = await _ocorrenciaService.DeleteOcorrenciaAsync(id, userId);
                if (success)
                {
                    return NoContent();
                }
                // This part might not be reached if service throws exceptions for failures
                return BadRequest(new { message = "Não foi possível excluir a ocorrência." });
            }
            catch (KeyNotFoundException knfex)
            {
                _logger.LogWarning(knfex, $"Recurso não encontrado ao excluir ocorrência ID {id}.");
                return NotFound(new { message = knfex.Message });
            }
            catch (UnauthorizedAccessException uex) // Should be caught by [Authorize]
            {
                _logger.LogWarning(uex, "Acesso não autorizado para excluir ocorrência ID {OcorrenciaId}.", id);
                return Unauthorized(new { message = uex.Message });
            }
            // catch (ForbiddenException fex)
            // {
            //     _logger.LogWarning(fex, "Acesso proibido para excluir ocorrência ID {OcorrenciaId}.", id);
            //     return Forbid(fex.Message);
            // }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Erro inesperado ao excluir ocorrência ID {id}.");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Ocorreu um erro interno." });
            }
        }

        // GET /api/ocorrencias/categorias
        [HttpGet("categorias")]
        [AllowAnonymous] // Typically categories are public, but can be [Authorize] if needed
        public async Task<IActionResult> GetCategorias()
        {
            try
            {
                var categorias = await _ocorrenciaService.GetCategoriasAsync();
                return Ok(categorias);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro inesperado ao buscar categorias de ocorrências.");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Ocorreu um erro interno." });
            }
        }
    }
}
