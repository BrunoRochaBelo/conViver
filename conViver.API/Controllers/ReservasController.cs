using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using conViver.Application.Services; // For ReservaService
using conViver.Core.DTOs;
using conViver.Application.Exceptions; // For NotFoundException, etc.
using System.ComponentModel.DataAnnotations; // For [Required]

namespace conViver.API.Controllers
{
    [ApiController]
    [Route("api/v1")]
    [Authorize] // Default authorization for the controller
    public class ReservasController : ControllerBase
    {
        private readonly ReservaService _reservaService;

        public ReservasController(ReservaService reservaService)
        {
            _reservaService = reservaService;
        }

        // --- Claim Helper Methods ---
        private Guid GetCondominioIdClaim()
        {
            var claim = User.FindFirstValue("condominioId");
            if (string.IsNullOrEmpty(claim) || !Guid.TryParse(claim, out Guid id))
                throw new UnauthorizedAccessException("CondominioId não encontrado ou inválido no token.");
            return id;
        }

        private Guid GetUserIdClaim()
        {
            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(claim) || !Guid.TryParse(claim, out Guid id))
                throw new UnauthorizedAccessException("UserId não encontrado ou inválido no token.");
            return id;
        }

        private Guid GetUnidadeIdClaim()
        {
            // Assuming "unidadeId" is a claim available for residents.
            // This might need adjustment based on actual claim setup.
            var claim = User.FindFirstValue("unidadeId");
            if (string.IsNullOrEmpty(claim) || !Guid.TryParse(claim, out Guid id))
                throw new UnauthorizedAccessException("UnidadeId não encontrada ou inválida no token.");
            return id;
        }

        private bool IsUserSindico() => User.IsInRole("Sindico") || User.IsInRole("Administrador");


        // --- Endpoints ---

        // GET /api/v1/app/reservas/agenda
        [HttpGet("app/reservas/agenda")]
        [Authorize(Roles = "Sindico,Administrador,Condomino,Inquilino")]
        public async Task<ActionResult<IEnumerable<AgendaReservaDto>>> GetAgendaComunitaria([FromQuery, Required] string mesAno, [FromQuery] Guid? espacoComumId)
        {
            if (!DateTime.TryParse($"{mesAno}-01", out var parsedMesAno))
                return BadRequest(new { message = "Formato de mesAno deve ser YYYY-MM." });
            try
            {
                var condominioId = GetCondominioIdClaim();
                var items = await _reservaService.GetAgendaComunitariaAsync(condominioId, parsedMesAno, espacoComumId);
                return Ok(items);
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex) { return StatusCode(500, $"Erro interno ao buscar agenda: {ex.Message}"); }
        }

        // GET /api/v1/app/reservas/minhas
        [HttpGet("app/reservas/minhas")]
        [Authorize(Roles = "Condomino,Inquilino,Sindico,Administrador")] // Sindico can also see their own if they have a unit
        public async Task<ActionResult<IEnumerable<ReservaDto>>> GetMinhasReservas([FromQuery] FiltroReservaDto filtro)
        {
            try
            {
                var condominioId = GetCondominioIdClaim();
                var usuarioId = GetUserIdClaim();
                var unidadeId = GetUnidadeIdClaim(); // Assumes user has one UnidadeId in claims.
                                                     // If a user (like Sindico) can have multiple or no direct UnidadeId, this needs adjustment.
                                                     // For now, proceed with this assumption.

                var reservas = await _reservaService.ListarMinhasReservasAsync(usuarioId, condominioId, unidadeId, filtro);
                return Ok(reservas);
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex) { return StatusCode(500, $"Erro interno ao buscar minhas reservas: {ex.Message}"); }
        }

        // GET /api/v1/syndic/reservas/todas
        [HttpGet("syndic/reservas/todas")]
        [Authorize(Roles = "Sindico,Administrador")]
        public async Task<ActionResult<IEnumerable<ReservaDto>>> GetTodasReservas([FromQuery] FiltroReservaDto filtro)
        {
            try
            {
                var condominioId = GetCondominioIdClaim();
                var reservas = await _reservaService.ListarTodasReservasAsync(condominioId, filtro);
                return Ok(reservas);
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex) { return StatusCode(500, $"Erro interno ao buscar todas as reservas: {ex.Message}"); }
        }

        // GET /api/v1/app/reservas/mural
        [HttpGet("app/reservas/mural")]
        [AllowAnonymous] // Or specific roles if mural has restricted access
        // [Authorize(Roles = "Sindico,Administrador,Condomino,Inquilino")] // If mural is not public
        public async Task<ActionResult<IEnumerable<MuralReservaDto>>> GetReservasMural()
        {
            // If mural is per-condominio and not globally anonymous:
            // var condominioId = GetCondominioIdClaim();
            // For now, assuming it might be for a specific condominio if user is authenticated,
            // or a default/public one if AllowAnonymous. Let's assume it requires auth for a condominio.
             if (!User.Identity.IsAuthenticated) return Unauthorized("Acesso ao mural requer autenticação para definir o condomínio.");

            try
            {
                var condominioId = GetCondominioIdClaim(); // Requires auth
                var items = await _reservaService.GetReservasParaMuralAsync(condominioId);
                return Ok(items);
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); } // If GetCondominioIdClaim fails
            catch (Exception ex) { return StatusCode(500, $"Erro interno ao buscar reservas para o mural: {ex.Message}"); }
        }


        // GET /api/v1/app/reservas/{id}
        [HttpGet("app/reservas/{id:guid}")]
        [Authorize(Roles = "Sindico,Administrador,Condomino,Inquilino")]
        public async Task<ActionResult<ReservaDto>> GetReservaDetalhes(Guid id)
        {
            try
            {
                var condominioId = GetCondominioIdClaim();
                var usuarioId = GetUserIdClaim();
                var isSindico = IsUserSindico();

                var reservaDto = await _reservaService.GetReservaDetalhesAsync(id, condominioId, usuarioId, isSindico);
                if (reservaDto == null) return NotFound(new { message = "Reserva não encontrada ou acesso não permitido." });
                return Ok(reservaDto);
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex) { return StatusCode(500, $"Erro interno ao buscar detalhes da reserva: {ex.Message}"); }
        }

        // POST /api/v1/app/reservas
        [HttpPost("app/reservas")]
        [Authorize(Roles = "Sindico,Administrador,Condomino,Inquilino")]
        public async Task<ActionResult<ReservaDto>> SolicitarReserva([FromBody] ReservaInputDto inputDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var condominioId = GetCondominioIdClaim();
                var usuarioId = GetUserIdClaim();
                var unidadeId = GetUnidadeIdClaim(); // Critical: user must have a unidadeId claim.

                var reservaDto = await _reservaService.SolicitarReservaAsync(condominioId, usuarioId, unidadeId, inputDto);
                if (reservaDto == null) return BadRequest(new { message = "Não foi possível criar a reserva. Verifique os dados e a disponibilidade."});
                return CreatedAtAction(nameof(GetReservaDetalhes), new { id = reservaDto.Id }, reservaDto);
            }
            catch (NotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex) { return StatusCode(500, $"Erro interno ao solicitar reserva: {ex.Message}"); }
        }

        // PUT /api/v1/syndic/reservas/{id}/status
        [HttpPut("syndic/reservas/{id:guid}/status")]
        [Authorize(Roles = "Sindico,Administrador")]
        public async Task<ActionResult<ReservaDto>> AtualizarStatusReserva(Guid id, [FromBody] ReservaStatusUpdateDto updateDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var condominioId = GetCondominioIdClaim();
                var sindicoUserId = GetUserIdClaim();

                var reservaDto = await _reservaService.AtualizarStatusReservaAsync(id, condominioId, sindicoUserId, updateDto);
                if (reservaDto == null) return NotFound(new { message = "Reserva não encontrada ou não pôde ser atualizada."});
                return Ok(reservaDto);
            }
            catch (NotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex) { return StatusCode(500, $"Erro interno ao atualizar status da reserva: {ex.Message}"); }
        }

        // PUT /api/v1/syndic/reservas/{id}
        [HttpPut("syndic/reservas/{id:guid}")]
        [Authorize(Roles = "Sindico,Administrador")]
        public async Task<ActionResult<ReservaDto>> EditarReserva(Guid id, [FromBody] ReservaInputDto inputDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var condominioId = GetCondominioIdClaim();
                var sindicoUserId = GetUserIdClaim();

                var reservaDto = await _reservaService.EditarReservaAsync(id, condominioId, sindicoUserId, inputDto);
                if (reservaDto == null) return NotFound(new { message = "Reserva não encontrada ou não pôde ser editada."});
                return Ok(reservaDto);
            }
            catch (NotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex) { return StatusCode(500, $"Erro interno ao editar reserva: {ex.Message}"); }
        }

        // DTO for CancelarReserva (if justification is in body)
        public class CancelamentoInputDto
        {
            [MaxLength(500, ErrorMessage = "A justificativa para cancelamento não pode exceder 500 caracteres.")]
            public string? Justificativa { get; set; }
        }

        // DELETE /api/v1/app/reservas/{id}
        [HttpDelete("app/reservas/{id:guid}")]
        [Authorize(Roles = "Sindico,Administrador,Condomino,Inquilino")]
        public async Task<ActionResult<ReservaDto>> CancelarReserva(Guid id, [FromBody] CancelamentoInputDto? cancelamentoDto) // DTO is optional for GET-like DELETEs, but good for justification
        {
            // For DELETE, body is not always standard. Could also be query param.
            // If DTO is null and body is expected, it might fail. Consider making DTO required or using FromQuery for justificativa.
            // For now, assuming DTO can be null if no body is sent.
            string? justificativa = cancelamentoDto?.Justificativa;

            try
            {
                var condominioId = GetCondominioIdClaim();
                var usuarioId = GetUserIdClaim();
                var isSindico = IsUserSindico();

                var reservaDto = await _reservaService.CancelarReservaAsync(id, condominioId, usuarioId, isSindico, justificativa);
                if (reservaDto == null) return NotFound(new { message = "Reserva não encontrada ou falha ao cancelar."}); // Or BadRequest depending on service logic
                return Ok(reservaDto); // Returning the cancelled reserva DTO
            }
            catch (NotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex) { return StatusCode(500, $"Erro interno ao cancelar reserva: {ex.Message}"); }
        }
    }
}
