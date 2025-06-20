using System;
using System.Security.Claims;
using System.Threading.Tasks;
using conViver.Application.Services;
using conViver.Core.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace conViver.API.Controllers
{
    [ApiController]
    public class OcorrenciasController : ControllerBase
    {
        private readonly OcorrenciaService _ocorrenciaService;
        private readonly ILogger<OcorrenciasController> _logger;

        public OcorrenciasController(OcorrenciaService ocorrenciaService, ILogger<OcorrenciasController> logger)
        {
            _ocorrenciaService = ocorrenciaService;
            _logger = logger;
        }

        private Guid GetUsuarioIdFromClaims()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) throw new UnauthorizedAccessException("User ID not found in token.");
            return Guid.Parse(userId);
        }

        private Guid GetCondominioIdFromClaims()
        {
            var condominioId = User.FindFirstValue("condominioId");
            if (string.IsNullOrEmpty(condominioId)) throw new UnauthorizedAccessException("Condomínio ID not found in token.");
            return Guid.Parse(condominioId);
        }

        private bool IsSyndic() => User.IsInRole("Syndic") || User.IsInRole("SubSyndic");

        [HttpPost("/api/v1/app/ocorrencias")]
        [Authorize(Roles = "Resident,Syndic,SubSyndic")]
        public async Task<IActionResult> RegistrarOcorrencia([FromBody] OcorrenciaInputDto input)
        {
            try
            {
                var usuarioId = GetUsuarioIdFromClaims();
                var condominioId = GetCondominioIdFromClaims();

                var ocorrencia = await _ocorrenciaService.RegistrarOcorrenciaAsync(condominioId, usuarioId, input);
                return CreatedAtAction(nameof(ObterOcorrenciaPorIdApp), new { id = ocorrencia.Id }, ocorrencia);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao registrar ocorrência.");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Erro interno ao registrar ocorrência." });
            }
        }

        [HttpGet("/api/v1/app/ocorrencias")]
        [Authorize(Roles = "Resident,Syndic,SubSyndic")]
        public async Task<IActionResult> ListarMinhasOcorrencias([FromQuery] string? status, [FromQuery] string? tipo)
        {
            try
            {
                var usuarioId = GetUsuarioIdFromClaims();
                var condominioId = GetCondominioIdFromClaims();

                var ocorrencias = await _ocorrenciaService.ListarOcorrenciasPorUsuarioAsync(condominioId, usuarioId, status, tipo);
                return Ok(ocorrencias);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao listar ocorrências do usuário.");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Erro interno ao listar ocorrências." });
            }
        }

        [HttpGet("/api/v1/app/ocorrencias/{id}")]
        [Authorize(Roles = "Resident,Syndic,SubSyndic")]
        public async Task<IActionResult> ObterOcorrenciaPorIdApp(Guid id)
        {
            try
            {
                var usuarioId = GetUsuarioIdFromClaims();
                var condominioId = GetCondominioIdFromClaims();

                var ocorrencia = await _ocorrenciaService.ObterOcorrenciaPorIdAsync(id, condominioId, usuarioId, IsSyndic());

                if (ocorrencia == null)
                    return NotFound(new { message = "Ocorrência não encontrada." });

                return Ok(ocorrencia);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Erro ao obter ocorrência {id}.");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Erro interno ao buscar ocorrência." });
            }
        }

        [HttpGet("/api/v1/syndic/ocorrencias")]
        [Authorize(Roles = "Syndic,SubSyndic")]
        public async Task<IActionResult> ListarOcorrenciasGestao([FromQuery] string? status, [FromQuery] string? tipo)
        {
            try
            {
                var condominioId = GetCondominioIdFromClaims();
                var ocorrencias = await _ocorrenciaService.ListarOcorrenciasParaGestaoAsync(condominioId, status, tipo);
                return Ok(ocorrencias);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao listar ocorrências para gestão.");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Erro interno ao listar ocorrências." });
            }
        }

        [HttpGet("/api/v1/syndic/ocorrencias/{id}")]
        [Authorize(Roles = "Syndic,SubSyndic")]
        public async Task<IActionResult> ObterOcorrenciaPorIdGestao(Guid id)
        {
            try
            {
                var condominioId = GetCondominioIdFromClaims();
                var usuarioId = GetUsuarioIdFromClaims();

                var ocorrencia = await _ocorrenciaService.ObterOcorrenciaPorIdAsync(id, condominioId, usuarioId, true);

                if (ocorrencia == null)
                    return NotFound(new { message = "Ocorrência não encontrada." });

                return Ok(ocorrencia);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Erro ao obter ocorrência {id} para gestão.");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Erro interno ao buscar ocorrência." });
            }
        }

        [HttpPut("/api/v1/syndic/ocorrencias/{id}")]
        [Authorize(Roles = "Syndic,SubSyndic")]
        public async Task<IActionResult> AtualizarOcorrencia(Guid id, [FromBody] OcorrenciaUpdateDto updateDto)
        {
            try
            {
                var condominioId = GetCondominioIdFromClaims();
                var gestorUserId = GetUsuarioIdFromClaims();

                var ocorrencia = await _ocorrenciaService.AtualizarOcorrenciaAsync(id, condominioId, gestorUserId, updateDto);

                if (ocorrencia == null)
                    return NotFound(new { message = "Ocorrência não encontrada para atualização." });

                return Ok(ocorrencia);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Erro ao atualizar ocorrência {id}.");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Erro interno ao atualizar ocorrência." });
            }
        }
    }
}
