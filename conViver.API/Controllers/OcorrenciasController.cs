using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using conViver.Application.Services;
using conViver.Core.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace conViver.API.Controllers
{
    [ApiController]
    public class OcorrenciasController : ControllerBase
    {
        private readonly OcorrenciaService _ocorrenciaService;

        public OcorrenciasController(OcorrenciaService ocorrenciaService)
        {
            _ocorrenciaService = ocorrenciaService;
        }

        private Guid GetUsuarioIdFromClaims() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? throw new UnauthorizedAccessException("User ID not found in token."));
        private Guid GetCondominioIdFromClaims() => Guid.Parse(User.FindFirstValue("condominioId") ?? throw new UnauthorizedAccessException("Condominio ID not found in token."));
        private bool IsSyndic() => User.IsInRole("Syndic") || User.IsInRole("SubSyndic"); // Assuming roles are set up

        // POST /api/v1/app/ocorrencias
        [HttpPost("/api/v1/app/ocorrencias")]
        [Authorize(Roles = "Resident,Syndic,SubSyndic")] // Any authenticated user in a condominio can register
        public async Task<IActionResult> RegistrarOcorrencia([FromBody] OcorrenciaInputDto input)
        {
            var usuarioId = GetUsuarioIdFromClaims();
            var condominioId = GetCondominioIdFromClaims();

            var ocorrencia = await _ocorrenciaService.RegistrarOcorrenciaAsync(condominioId, usuarioId, input);
            var dto = new OcorrenciaDto // Manual mapping here or use the service's mapper if preferred
            {
                Id = ocorrencia.Id,
                CondominioId = ocorrencia.CondominioId,
                UnidadeId = ocorrencia.UnidadeId,
                UsuarioId = ocorrencia.UsuarioId,
                Titulo = ocorrencia.Titulo,
                Descricao = ocorrencia.Descricao,
                Fotos = ocorrencia.Fotos,
                Status = ocorrencia.Status,
                Tipo = ocorrencia.Tipo,
                DataOcorrencia = ocorrencia.DataOcorrencia,
                CreatedAt = ocorrencia.CreatedAt,
                UpdatedAt = ocorrencia.UpdatedAt
            };
            return CreatedAtAction(nameof(ObterOcorrenciaPorIdApp), new { id = ocorrencia.Id }, dto);
        }

        // GET /api/v1/app/ocorrencias
        [HttpGet("/api/v1/app/ocorrencias")]
        [Authorize(Roles = "Resident,Syndic,SubSyndic")]
        public async Task<IActionResult> ListarMinhasOcorrencias([FromQuery] string? status, [FromQuery] string? tipo)
        {
            var usuarioId = GetUsuarioIdFromClaims();
            var condominioId = GetCondominioIdFromClaims();
            var ocorrencias = await _ocorrenciaService.ListarOcorrenciasPorUsuarioAsync(condominioId, usuarioId, status, tipo);
            return Ok(ocorrencias);
        }

        // GET /api/v1/app/ocorrencias/{id}
        [HttpGet("/api/v1/app/ocorrencias/{id}")]
        [Authorize(Roles = "Resident,Syndic,SubSyndic")]
        public async Task<IActionResult> ObterOcorrenciaPorIdApp(Guid id)
        {
            var usuarioId = GetUsuarioIdFromClaims();
            var condominioId = GetCondominioIdFromClaims();
            var ocorrencia = await _ocorrenciaService.ObterOcorrenciaPorIdAsync(id, condominioId, usuarioId, IsSyndic()); // Pass IsSyndic for broader access if manager

            if (ocorrencia == null)
            {
                return NotFound();
            }
            return Ok(ocorrencia);
        }

        // GET /api/v1/syndic/ocorrencias
        [HttpGet("/api/v1/syndic/ocorrencias")]
        [Authorize(Roles = "Syndic,SubSyndic")] // Only management roles
        public async Task<IActionResult> ListarOcorrenciasGestao([FromQuery] string? status, [FromQuery] string? tipo)
        {
            var condominioId = GetCondominioIdFromClaims();
            var ocorrencias = await _ocorrenciaService.ListarOcorrenciasParaGestaoAsync(condominioId, status, tipo);
            return Ok(ocorrencias);
        }

        // GET /api/v1/syndic/ocorrencias/{id}
        [HttpGet("/api/v1/syndic/ocorrencias/{id}")]
        [Authorize(Roles = "Syndic,SubSyndic")]
        public async Task<IActionResult> ObterOcorrenciaPorIdGestao(Guid id)
        {
            var condominioId = GetCondominioIdFromClaims();
            var usuarioId = GetUsuarioIdFromClaims(); // Needed for the service method, even if primarily for gestor
            var ocorrencia = await _ocorrenciaService.ObterOcorrenciaPorIdAsync(id, condominioId, usuarioId, true); // isGestor = true

            if (ocorrencia == null)
            {
                return NotFound();
            }
            return Ok(ocorrencia);
        }

        // PUT /api/v1/syndic/ocorrencias/{id}
        [HttpPut("/api/v1/syndic/ocorrencias/{id}")]
        [Authorize(Roles = "Syndic,SubSyndic")]
        public async Task<IActionResult> AtualizarOcorrencia(Guid id, [FromBody] OcorrenciaUpdateDto updateDto)
        {
            var condominioId = GetCondominioIdFromClaims();
            var gestorUserId = GetUsuarioIdFromClaims();

            var ocorrencia = await _ocorrenciaService.AtualizarOcorrenciaAsync(id, condominioId, gestorUserId, updateDto);

            if (ocorrencia == null)
            {
                return NotFound();
            }
            return Ok(ocorrencia);
        }
    }
}
