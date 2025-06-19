using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using conViver.Application.Services; // For EspacoComumService and ReservaService
using conViver.Core.DTOs;
using conViver.Application.Exceptions; // For NotFoundException

namespace conViver.API.Controllers
{
    [ApiController]
    [Route("api/v1")]
    public class EspacosComunsController : ControllerBase
    {
        private readonly EspacoComumService _espacoComumService;
        private readonly ReservaService _reservaService; // For maintenance block/unblock

        public EspacosComunsController(EspacoComumService espacoComumService, ReservaService reservaService)
        {
            _espacoComumService = espacoComumService;
            _reservaService = reservaService;
        }

        private Guid GetCondominioIdClaim()
        {
            var condominioIdClaim = User.FindFirstValue("condominioId");
            if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
            {
                throw new UnauthorizedAccessException("CondominioId não encontrado ou inválido no token do usuário.");
            }
            return condominioId;
        }

        private Guid GetUserIdClaim()
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid userId))
            {
                throw new UnauthorizedAccessException("UserId não encontrado ou inválido no token do usuário.");
            }
            return userId;
        }

        // POST /api/v1/syndic/espacos-comuns
        [HttpPost("syndic/espacos-comuns")]
        [Authorize(Roles = "Sindico,Administrador")] // Assuming Administrador is similar to Sindico
        public async Task<ActionResult<EspacoComumDto>> CriarEspacoComum([FromBody] EspacoComumInputDto inputDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var condominioId = GetCondominioIdClaim();
                // Ensure DTO's CondominioId matches claim, or is set by claim if not in DTO
                if (inputDto.CondominioId == Guid.Empty) inputDto.CondominioId = condominioId;
                else if (inputDto.CondominioId != condominioId) return Forbid("Operação não permitida para o condomínio especificado no DTO.");

                var espacoComumDto = await _espacoComumService.CriarEspacoComumAsync(inputDto, condominioId);
                if (espacoComumDto == null) return BadRequest("Não foi possível criar o espaço comum."); // Should be handled by service exceptions ideally
                return CreatedAtAction(nameof(GetEspacoComumPorId), new { id = espacoComumDto.Id }, espacoComumDto);
            }
            catch (NotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
        }

        // PUT /api/v1/syndic/espacos-comuns/{id}
        [HttpPut("syndic/espacos-comuns/{id:guid}")]
        [Authorize(Roles = "Sindico,Administrador")]
        public async Task<ActionResult<EspacoComumDto>> AtualizarEspacoComum(Guid id, [FromBody] EspacoComumInputDto inputDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var condominioId = GetCondominioIdClaim();
                 // Ensure DTO's CondominioId matches claim for consistency, or is set by claim
                if (inputDto.CondominioId == Guid.Empty) inputDto.CondominioId = condominioId;
                else if (inputDto.CondominioId != condominioId) return Forbid("Operação não permitida: Condomínio do DTO não corresponde ao do usuário.");


                var espacoComumDto = await _espacoComumService.AtualizarEspacoComumAsync(id, inputDto, condominioId);
                if (espacoComumDto == null) return NotFound($"Espaço comum com ID {id} não encontrado para este condomínio.");
                return Ok(espacoComumDto);
            }
            catch (NotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
        }

        // GET /api/v1/app/espacos-comuns
        [HttpGet("app/espacos-comuns")]
        [Authorize(Roles = "Sindico,Administrador,Condomino,Inquilino")] // All authenticated users
        public async Task<ActionResult<IEnumerable<EspacoComumDto>>> ListarEspacosComuns()
        {
            try
            {
                var condominioId = GetCondominioIdClaim();
                var espacos = await _espacoComumService.ListarEspacosComunsAsync(condominioId);
                return Ok(espacos);
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
        }

        // GET /api/v1/app/espacos-comuns/{id}
        [HttpGet("app/espacos-comuns/{id:guid}")]
        [Authorize(Roles = "Sindico,Administrador,Condomino,Inquilino")]
        public async Task<ActionResult<EspacoComumDto>> GetEspacoComumPorId(Guid id)
        {
            try
            {
                var condominioId = GetCondominioIdClaim();
                var espacoComum = await _espacoComumService.ObterEspacoComumPorIdAsync(id, condominioId);
                if (espacoComum == null) return NotFound($"Espaço comum com ID {id} não encontrado ou não pertence ao seu condomínio.");
                return Ok(espacoComum);
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
        }

        // DELETE /api/v1/syndic/espacos-comuns/{id}
        [HttpDelete("syndic/espacos-comuns/{id:guid}")]
        [Authorize(Roles = "Sindico,Administrador")]
        public async Task<IActionResult> ExcluirEspacoComum(Guid id)
        {
            try
            {
                var condominioId = GetCondominioIdClaim();
                var success = await _espacoComumService.ExcluirEspacoComumAsync(id, condominioId);
                if (!success) return NotFound($"Espaço comum com ID {id} não encontrado para exclusão ou falha na operação."); // Service might throw NotFoundException too
                return NoContent();
            }
            catch (NotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); } // e.g. has active reservations
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
        }

        // PUT /api/v1/syndic/espacos-comuns/{id}/regras
        [HttpPut("syndic/espacos-comuns/{id:guid}/regras")]
        [Authorize(Roles = "Sindico,Administrador")]
        public async Task<IActionResult> DefinirRegrasUso(Guid id, [FromBody] RegrasUsoEspacoDto regrasDto)
        {
             if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var condominioId = GetCondominioIdClaim();
                var success = await _espacoComumService.DefinirRegrasUsoAsync(id, regrasDto, condominioId);
                if (!success) return NotFound($"Espaço comum com ID {id} não encontrado ou falha ao definir regras.");
                return Ok(new { message = "Regras atualizadas com sucesso." });
            }
            catch (NotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
        }

        // DTO for BloquearEspacoParaManutencao
        public class BloqueioInputDto
        {
            [System.ComponentModel.DataAnnotations.Required]
            public DateTime Inicio { get; set; }
            [System.ComponentModel.DataAnnotations.Required]
            public DateTime Fim { get; set; }
            [System.ComponentModel.DataAnnotations.Required]
            [System.ComponentModel.DataAnnotations.MaxLength(200)]
            public string Motivo { get; set; } = string.Empty;
            // public Guid? UnidadeIdParaBloqueio { get; set; } // Controller needs to decide this or service needs to handle nullable
        }

        // POST /api/v1/syndic/espacos-comuns/{id}/bloquear-manutencao
        [HttpPost("syndic/espacos-comuns/{id:guid}/bloquear-manutencao")]
        [Authorize(Roles = "Sindico,Administrador")]
        public async Task<ActionResult<ReservaDto>> BloquearParaManutencao(Guid id, [FromBody] BloqueioInputDto bloqueioDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var condominioId = GetCondominioIdClaim();
                var adminUserId = GetUserIdClaim();
                // The ReservaService.BloquearEspacoParaManutencaoAsync needs a UnidadeId for the block.
                // This is still a design concern. For now, the service uses Guid.Empty.
                // A real implementation might pass a system UnidadeId or make it nullable.
                var reservaBloqueio = await _reservaService.BloquearEspacoParaManutencaoAsync(id, condominioId, adminUserId, bloqueioDto.Inicio, bloqueioDto.Fim, bloqueioDto.Motivo);
                if (reservaBloqueio == null) return BadRequest("Não foi possível bloquear o espaço para manutenção.");
                return Ok(reservaBloqueio);
            }
            catch (NotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); } // e.g. conflicts
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            // catch (NotImplementedException ex) { return StatusCode(501, new { message = ex.Message }); } // For the UnidadeId issue
        }

        // POST /api/v1/syndic/espacos-comuns/{id}/desbloquear-manutencao
        [HttpPost("syndic/espacos-comuns/{id:guid}/desbloquear-manutencao")] // {id} here is the EspacoComum ID, but service needs Reserva ID
                                                                       // This endpoint should ideally take Reserva ID of the block.
                                                                       // Let's assume for now the client finds the block's Reserva ID.
                                                                       // Or, this controller finds it first.
                                                                       // For simplicity in this subtask, let's change the route to expect Reserva ID
        [HttpPost("syndic/reservas-bloqueio/{reservaBloqueioId:guid}/desbloquear")]
        [Authorize(Roles = "Sindico,Administrador")]
        public async Task<IActionResult> DesbloquearManutencao(Guid reservaBloqueioId)
        {
            try
            {
                var condominioId = GetCondominioIdClaim();
                var adminUserId = GetUserIdClaim();
                var success = await _reservaService.DesbloquearEspacoManutencaoAsync(reservaBloqueioId, condominioId, adminUserId);
                if (!success) return BadRequest("Não foi possível desbloquear o espaço.");
                return Ok(new { message = "Espaço desbloqueado com sucesso." });
            }
            catch (NotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
        }
    }
}
