using Microsoft.AspNetCore.Mvc;
using conViver.Core.Entities; // Será substituído por DTOs na maioria dos retornos
using conViver.Application;    // Assumindo que ReservaService está aqui
using conViver.Core.DTOs;      // Adicionado para DTOs
using Microsoft.AspNetCore.Authorization;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Security.Claims;  // Adicionado
using System.ComponentModel.DataAnnotations; // Para [Required]

namespace conViver.API.Controllers;

[ApiController]
[Route("api/v1")] // Rota base ajustada para consistência, endpoints especificarão o resto
[Authorize]
public class ReservasController : ControllerBase
{
    private readonly ReservaService _reservas;

    public ReservasController(ReservaService reservas)
    {
        _reservas = reservas;
    }

    /// <summary>
    /// Obtém a agenda de reservas para um determinado mês/ano.
    /// </summary>
    /// <param name="mesAno">O mês e ano no formato YYYY-MM.</param>
    /// <returns>Uma lista de reservas para o período.</returns>
    /// <response code="200">Retorna a agenda de reservas.</response>
    /// <response code="400">Formato de data inválido.</response>
    /// <response code="401">Usuário não autorizado ou CondominioId inválido.</response>
    [HttpGet("app/reservas/agenda")] // Rota completa: /api/v1/app/reservas/agenda
    [Authorize(Roles = "Sindico,Condomino,Inquilino")]
    public async Task<ActionResult<IEnumerable<AgendaReservaDto>>> GetAgenda([FromQuery, Required] string mesAno)
    {
        if (!DateTime.TryParse($"{mesAno}-01", out var mes))
            return BadRequest(new { error = "INVALID_DATE", message = "Formato de mesAno deve ser YYYY-MM." });

        var condominioIdClaim = User.FindFirstValue("condominioId");
        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("CondominioId não encontrado ou inválido no token.");
        }

        // Assumindo que _reservas.GetAgendaAsync foi atualizado para receber condominioId e retornar DTOs
        var items = await _reservas.GetAgendaAsync(condominioId, mes);
        return Ok(items);
    }

    /// <summary>
    /// Obtém detalhes de uma reserva específica.
    /// </summary>
    /// <param name="id">ID da reserva.</param>
    /// <returns>Detalhes da reserva.</returns>
    /// <response code="200">Retorna os detalhes da reserva.</response>
    /// <response code="401">Usuário não autorizado ou não tem permissão para ver esta reserva.</response>
    /// <response code="404">Reserva não encontrada.</response>
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

        // Assumindo que _reservas.GetByIdAsync foi atualizado para receber condominioId e userId (para verificação de permissão)
        var reservaDto = await _reservas.GetByIdAsync(id, condominioId, userId);
        if (reservaDto == null) return NotFound("Reserva não encontrada ou acesso não permitido.");
        return Ok(reservaDto);
    }

    /// <summary>
    /// Cria uma nova solicitação de reserva para uma área comum.
    /// </summary>
    /// <param name="inputDto">Dados da reserva.</param>
    /// <returns>A reserva criada.</returns>
    /// <response code="201">Retorna a reserva criada.</response>
    /// <response code="400">Dados de entrada inválidos.</response>
    /// <response code="401">Usuário não autorizado ou claims inválidas.</response>
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

        // Assumindo que _reservas.SolicitarAsync foi atualizado
        var reservaDto = await _reservas.SolicitarAsync(condominioId, usuarioId, inputDto);
        if (reservaDto == null)
        {
            // Pode ocorrer se, por exemplo, a área não existir, já estiver reservada, etc.
            return BadRequest("Não foi possível criar a reserva. Verifique os dados e a disponibilidade.");
        }
        return CreatedAtAction(nameof(GetReservaPorId), new { id = reservaDto.Id }, reservaDto);
    }

    /// <summary>
    /// (Síndico) Aprova ou recusa uma solicitação de reserva.
    /// </summary>
    /// <param name="id">ID da reserva a ser atualizada.</param>
    /// <param name="updateDto">Novo status e justificativa.</param>
    /// <returns>Nenhum conteúdo ou a reserva atualizada.</returns>
    /// <response code="200">Reserva atualizada com sucesso (se retornar o objeto).</response>
    /// <response code="204">Reserva atualizada com sucesso (se não retornar corpo).</response>
    /// <response code="400">Dados de entrada inválidos (ex: status inválido).</response>
    /// <response code="401">Usuário não autorizado ou CondominioId inválido.</response>
    /// <response code="403">Usuário não tem permissão (não é Síndico).</response>
    /// <response code="404">Reserva não encontrada.</response>
    [HttpPut("syndic/reservas/{id:guid}")] // Rota ajustada para API Ref 6.3
    [Authorize(Roles = "Sindico")]
    public async Task<IActionResult> AtualizarStatusReserva(Guid id, [FromBody] ReservaStatusUpdateDto updateDto)
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
            // Assumindo que _reservas.AtualizarStatusAsync foi atualizado
            var reservaAtualizadaDto = await _reservas.AtualizarStatusAsync(id, condominioId, sindicoUserId, updateDto);
            if(reservaAtualizadaDto == null) return NotFound("Reserva não encontrada ou não pôde ser atualizada.");
            return Ok(reservaAtualizadaDto); // Retornar DTO atualizado
        }
        catch (InvalidOperationException ex) // Ex: tentativa de aprovar reserva já cancelada
        {
            return BadRequest(new { error="INVALID_OPERATION", message = ex.Message });
        }
    }

    /// <summary>
    /// Cancela uma reserva (solicitada pelo próprio usuário ou síndico).
    /// </summary>
    /// <param name="id">ID da reserva a ser cancelada.</param>
    /// <returns>Nenhum conteúdo.</returns>
    /// <response code="204">Reserva cancelada com sucesso.</response>
    /// <response code="401">Usuário não autorizado ou claims inválidas.</response>
    /// <response code="403">Usuário não tem permissão para cancelar esta reserva.</response>
    /// <response code="404">Reserva não encontrada.</response>
    [HttpDelete("app/reservas/{id:guid}")] // Rota para API Ref 6.4
    [Authorize(Roles = "Sindico,Condomino,Inquilino")] // Síndico também pode cancelar
    public async Task<IActionResult> CancelarReserva(Guid id)
    {
        var condominioIdClaim = User.FindFirstValue("condominioId");
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId) ||
            string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid usuarioId))
        {
            return Unauthorized("CondominioId ou UserId não encontrado ou inválido no token.");
        }

        // Assumindo que _reservas.CancelarAsync foi atualizado
        var sucesso = await _reservas.CancelarAsync(id, condominioId, usuarioId, User.IsInRole("Sindico"));
        if (!sucesso)
        {
            // Pode ser NotFound ou Forbidden dependendo do motivo da falha
            return NotFound("Reserva não encontrada ou não pôde ser cancelada (verifique permissões).");
        }
        return NoContent();
    }
}
