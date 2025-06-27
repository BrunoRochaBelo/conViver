using Microsoft.AspNetCore.Mvc;
using conViver.Application.Services;
using conViver.Core.DTOs;
using Microsoft.AspNetCore.Authorization;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Security.Claims;
using System.ComponentModel.DataAnnotations;

namespace conViver.API.Controllers;

[ApiController]
[Route("api/v1")]
[Authorize]
public class ReservasController : ControllerBase
{
    private readonly ReservaService _reservaService;

    public ReservasController(ReservaService reservaService)
    {
        _reservaService = reservaService;
    }

    /// <summary>
    /// Obtém a agenda de reservas para um determinado mês/ano. (App)
    /// </summary>
    [HttpGet("app/reservas/agenda")]
    [Authorize(Roles = "Sindico,Condomino,Inquilino")]
    public async Task<ActionResult<IEnumerable<AgendaReservaDto>>> GetAgenda(
        [FromQuery, Required] string mesAno,
        [FromQuery] Guid? espacoComumId,
        [FromQuery] string? status,
        [FromQuery] Guid? unidadeId)
    {
        if (!DateTime.TryParse($"{mesAno}-01", out var mes))
            return BadRequest(new { error = "INVALID_DATE", message = "Formato de mesAno deve ser YYYY-MM." });

        var condominioIdClaim = User.FindFirstValue("condominioId");
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId) ||
            string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid usuarioLogadoId))
        {
            return Unauthorized("CondominioId ou UserId não encontrado ou inválido no token.");
        }

        bool isSindico = User.IsInRole("Sindico");
        var items = await _reservaService.GetAgendaAsync(
            condominioId,
            mes,
            usuarioLogadoId,
            espacoComumId,
            status,
            unidadeId,
            isSindico);
        return Ok(items);
    }

    /// <summary>
    /// Lista todos os espaços comuns disponíveis para reserva no condomínio. (App)
    /// </summary>
    [HttpGet("app/reservas/espacos-comuns")]
    [Authorize(Roles = "Sindico,Condomino,Inquilino")]
    public async Task<ActionResult<IEnumerable<EspacoComumDto>>> ListarEspacosComuns()
    {
        var condominioIdClaim = User.FindFirstValue("condominioId");
        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("CondominioId não encontrado ou inválido no token.");
        }

        var espacos = await _reservaService.ListarEspacosComunsAsync(condominioId);
        return Ok(espacos);
    }


    /// <summary>
    /// Obtém detalhes de uma reserva específica. (App)
    /// </summary>
    [HttpGet("app/reservas/{id:guid}")]
    [Authorize(Roles = "Sindico,Condomino,Inquilino")]
    public async Task<ActionResult<ReservaDto>> GetReservaPorId(Guid id)
    {
        var condominioIdClaim = User.FindFirstValue("condominioId");
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId) ||
            string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid userId))
        {
            return Unauthorized("CondominioId ou UserId não encontrado ou inválido no token.");
        }

        bool isSindico = User.IsInRole("Sindico");
        var reservaDto = await _reservaService.GetByIdAsync(id, condominioId, userId, isSindico);

        if (reservaDto == null) return NotFound("Reserva não encontrada ou acesso não permitido.");
        return Ok(reservaDto);
    }

    /// <summary>
    /// Cria uma nova solicitação de reserva para uma área comum. (App)
    /// </summary>
    [HttpPost("app/reservas")]
    [Authorize(Roles = "Sindico,Condomino,Inquilino")]
    public async Task<ActionResult<ReservaDto>> SolicitarReserva([FromBody] ReservaInputDto inputDto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var condominioIdClaim = User.FindFirstValue("condominioId");
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId) ||
            string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid usuarioId))
        {
            return Unauthorized("CondominioId ou UserId não encontrado ou inválido no token.");
        }

        try
        {
            var reservaDto = await _reservaService.SolicitarAsync(condominioId, usuarioId, inputDto);
            if (reservaDto == null)
                return StatusCode(500, "Erro ao criar reserva.");
            return CreatedAtAction(nameof(GetReservaPorId), new { id = reservaDto.Id }, reservaDto);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = "INVALID_ARGUMENT", message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = "BUSINESS_RULE_VIOLATION", message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = "NOT_FOUND", message = ex.Message });
        }
    }

    /// <summary>
    /// Cancela uma reserva (solicitada pelo próprio usuário ou síndico). (App)
    /// </summary>
    [HttpDelete("app/reservas/{id:guid}")]
    [HttpPost("app/reservas/{id:guid}/cancelar")]
    [Authorize(Roles = "Sindico,Condomino,Inquilino")]
    public async Task<IActionResult> CancelarReserva(Guid id)
    {
        var condominioIdClaim = User.FindFirstValue("condominioId");
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId) ||
            string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid usuarioId))
        {
            return Unauthorized("CondominioId ou UserId não encontrado ou inválido no token.");
        }

        try
        {
            bool isSindico = User.IsInRole("Sindico");
            var sucesso = await _reservaService.CancelarAsync(id, condominioId, usuarioId, isSindico);
            if (!sucesso) // Serviço agora lança exceção em caso de não encontrar, então essa checagem pode ser redundante.
            {
                return NotFound(new { error = "CANCEL_FAILED", message = "Reserva não encontrada ou não pôde ser cancelada." });
            }
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = "NOT_FOUND", message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = "CANCEL_RULE_VIOLATION", message = ex.Message });
        }
    }

    /// <summary>
    /// (App) Lista reservas em formato paginado.
    /// </summary>
    [HttpGet("app/reservas/lista")]
    [Authorize(Roles = "Sindico,Condomino,Inquilino")]
    public async Task<ActionResult<PaginatedResultDto<ReservaDto>>> ListarReservasPaginadas([FromQuery] ReservaFilterDto filters)
    {
        var condominioIdClaim = User.FindFirstValue("condominioId");
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId) ||
            string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid usuarioId))
        {
            return Unauthorized("CondominioId ou UserId não encontrado ou inválido no token.");
        }

        bool isSindico = User.IsInRole("Sindico");
        var result = await _reservaService.ListarReservasListViewAsync(condominioId, usuarioId, filters, isSindico);
        return Ok(result);
    }

    /// <summary>
    /// (App) Lista as reservas do usuário logado.
    /// </summary>
    [HttpGet("app/reservas/minhas"), HttpGet("app/reservas/minhas-reservas")]
    [Authorize(Roles = "Sindico,Condomino,Inquilino")]
    public async Task<ActionResult<IEnumerable<ReservaDto>>> ListarMinhasReservas([
        FromQuery] Guid? espacoComumId,
        [FromQuery] string? status,
        [FromQuery] DateTime? periodoInicio,
        [FromQuery] DateTime? periodoFim)
    {
        var condominioIdClaim = User.FindFirstValue("condominioId");
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId) ||
            string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid usuarioId))
        {
            return Unauthorized("CondominioId ou UserId não encontrado ou inválido no token.");
        }

        var reservas = await _reservaService.ListarMinhasReservasAsync(
            condominioId,
            usuarioId,
            espacoComumId,
            status,
            periodoInicio,
            periodoFim);
        return Ok(reservas);
    }

    // --- Endpoints de Gestão de Reservas para Síndico ---

    /// <summary>
    /// (Síndico) Aprova, recusa ou modifica o status de uma solicitação de reserva.
    /// </summary>
    [HttpPut("syndic/reservas/{id:guid}/status")]
    [Authorize(Roles = "Sindico")]
    public async Task<ActionResult<ReservaDto>> SyndicAtualizarStatusReserva(Guid id, [FromBody] ReservaStatusUpdateDto updateDto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var condominioIdClaim = User.FindFirstValue("condominioId");
        var sindicoUserIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId) ||
            string.IsNullOrEmpty(sindicoUserIdClaim) || !Guid.TryParse(sindicoUserIdClaim, out Guid sindicoUserId))
        {
            return Unauthorized("CondominioId ou UserId do síndico não encontrado ou inválido no token.");
        }

        try
        {
            var reservaAtualizadaDto = await _reservaService.AtualizarStatusAsync(id, condominioId, sindicoUserId, updateDto);
            // AtualizarStatusAsync agora lança KeyNotFoundException se não encontrar
            return Ok(reservaAtualizadaDto);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = "NOT_FOUND", message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = "INVALID_ARGUMENT", message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = "INVALID_OPERATION", message = ex.Message });
        }
    }

    /// <summary>
    /// (Síndico) Lista todas as reservas do condomínio com filtros e paginação.
    /// </summary>
    [HttpGet("syndic/reservas")]
    [Authorize(Roles = "Sindico")]
    public async Task<ActionResult<PaginatedResultDto<ReservaDto>>> SyndicListarTodasReservas([FromQuery] ReservaFilterDto filters)
    {
        var condominioIdClaim = User.FindFirstValue("condominioId");
        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("CondominioId não encontrado ou inválido no token.");
        }

        var paginatedResult = await _reservaService.ListarTodasReservasAsync(condominioId, filters);
        return Ok(paginatedResult);
    }

    /// <summary>
    /// (Síndico) Edita uma reserva existente.
    /// </summary>
    [HttpPut("syndic/reservas/{id:guid}/editar")]
    [Authorize(Roles = "Sindico")]
    public async Task<ActionResult<ReservaDto>> SyndicEditarReserva(Guid id, [FromBody] ReservaInputDto inputDto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var condominioIdClaim = User.FindFirstValue("condominioId");
        var sindicoUserIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId) ||
            string.IsNullOrEmpty(sindicoUserIdClaim) || !Guid.TryParse(sindicoUserIdClaim, out Guid sindicoUserId))
        {
            return Unauthorized("CondominioId ou UserId do síndico não encontrado ou inválido no token.");
        }

        try
        {
            var reservaAtualizadaDto = await _reservaService.EditarReservaAsync(id, condominioId, sindicoUserId, inputDto);
            return Ok(reservaAtualizadaDto);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = "NOT_FOUND", message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = "INVALID_ARGUMENT", message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = "BUSINESS_RULE_VIOLATION", message = ex.Message });
        }
    }


    // --- Endpoints de Gestão de Espaços Comuns para Síndico ---

    /// <summary>
    /// (Síndico) Lista todos os espaços comuns do condomínio (incluindo suas regras).
    /// </summary>
    [HttpGet("syndic/reservas/espacos-comuns")]
    [Authorize(Roles = "Sindico")]
    public async Task<ActionResult<IEnumerable<EspacoComumDto>>> SyndicListarEspacosComuns()
    {
        var condominioIdClaim = User.FindFirstValue("condominioId");
        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("CondominioId não encontrado ou inválido no token.");
        }
        var espacos = await _reservaService.ListarEspacosComunsAsync(condominioId);
        return Ok(espacos);
    }

    /// <summary>
    /// (Síndico) Obtém detalhes de um espaço comum específico.
    /// </summary>
    [HttpGet("syndic/reservas/espacos-comuns/{id:guid}")]
    [Authorize(Roles = "Sindico")]
    public async Task<ActionResult<EspacoComumDto>> SyndicGetEspacoComumPorId(Guid id)
    {
        var condominioIdClaim = User.FindFirstValue("condominioId");
        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("CondominioId não encontrado ou inválido no token.");
        }
        var espacoDto = await _reservaService.GetEspacoComumByIdAsync(id, condominioId);
        if (espacoDto == null) return NotFound("Espaço comum não encontrado.");
        return Ok(espacoDto);
    }

    /// <summary>
    /// (Síndico) Cria um novo espaço comum.
    /// </summary>
    [HttpPost("syndic/reservas/espacos-comuns")]
    [Authorize(Roles = "Sindico")]
    public async Task<ActionResult<EspacoComumDto>> SyndicCriarEspacoComum([FromBody] EspacoComumDto inputDto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var condominioIdClaim = User.FindFirstValue("condominioId");
        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("CondominioId não encontrado ou inválido no token.");
        }
        try
        {
            var espacoCriadoDto = await _reservaService.CriarEspacoComumAsync(condominioId, inputDto);
            if (espacoCriadoDto == null)
                return StatusCode(500, "Erro ao criar espaço comum.");
            return CreatedAtAction(nameof(SyndicGetEspacoComumPorId), new { id = espacoCriadoDto.Id }, espacoCriadoDto);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = "INVALID_INPUT", message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = "CREATION_FAILED", message = ex.Message });
        }
    }

    /// <summary>
    /// (Síndico) Atualiza um espaço comum existente.
    /// </summary>
    [HttpPut("syndic/reservas/espacos-comuns/{id:guid}")]
    [Authorize(Roles = "Sindico")]
    public async Task<ActionResult<EspacoComumDto>> SyndicAtualizarEspacoComum(Guid id, [FromBody] EspacoComumDto inputDto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var condominioIdClaim = User.FindFirstValue("condominioId");
        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("CondominioId não encontrado ou inválido no token.");
        }
        try
        {
            if (inputDto.Id != Guid.Empty && inputDto.Id != id)
            {
                return BadRequest("Conflito entre ID da rota e ID do corpo da requisição.");
            }
            inputDto.Id = id;

            var espacoAtualizadoDto = await _reservaService.AtualizarEspacoComumAsync(id, condominioId, inputDto);
            // AtualizarEspacoComumAsync agora lança KeyNotFoundException
            return Ok(espacoAtualizadoDto);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = "NOT_FOUND", message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = "INVALID_INPUT", message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = "UPDATE_FAILED", message = ex.Message });
        }
    }

    /// <summary>
    /// (Síndico) Exclui um espaço comum.
    /// </summary>
    [HttpDelete("syndic/reservas/espacos-comuns/{id:guid}")]
    [Authorize(Roles = "Sindico")]
    public async Task<IActionResult> SyndicExcluirEspacoComum(Guid id)
    {
        var condominioIdClaim = User.FindFirstValue("condominioId");
        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("CondominioId não encontrado ou inválido no token.");
        }
        try
        {
            var sucesso = await _reservaService.ExcluirEspacoComumAsync(id, condominioId);
            // ExcluirEspacoComumAsync agora lança KeyNotFoundException
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = "NOT_FOUND", message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = "DELETE_RULE_VIOLATION", message = ex.Message });
        }
        catch (Exception ex)
        {
            // Log ex
            Console.Error.WriteLine(ex);
            return StatusCode(500, new { error = "INTERNAL_ERROR", message = "Erro ao excluir espaço comum." });
        }
    }
}
