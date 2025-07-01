using Microsoft.AspNetCore.Mvc;
using conViver.Application.Services; // Mantido, pois CalendarioService está neste namespace
using conViver.Core.DTOs; // Mantido, pois os DTOs (agora Calendario*Dto) estão neste namespace
using Microsoft.AspNetCore.Authorization;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Security.Claims;
using System.ComponentModel.DataAnnotations;

namespace conViver.API.Controllers;

[ApiController]
[Route("api/v1")] // Rota base mantida
[Authorize]
public class CalendarioController : ControllerBase // Renomeado de ReservasController
{
    private readonly CalendarioService _calendarioService; // Renomeado de _reservaService

    public CalendarioController(CalendarioService calendarioService) // Renomeado de ReservasController
    {
        _calendarioService = calendarioService; // Renomeado de _reservaService
    }

    /// <summary>
    /// Obtém a agenda de itens do calendário para um determinado mês/ano. (App)
    /// </summary>
    [HttpGet("app/reservas/agenda")] // Rota mantida como /reservas/ para compatibilidade
    [Authorize(Roles = "Sindico,Morador")]
    public async Task<ActionResult<IEnumerable<AgendaCalendarioItemDto>>> GetAgenda( // Retorna AgendaCalendarioItemDto
        [FromQuery, Required] string mesAno,
        [FromQuery] Guid? espacoComumId,
        [FromQuery] string? status,
        [FromQuery] Guid? unidadeId,
        [FromQuery] string? tipoItem) // Novo filtro para tipo de item
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
        var items = await _calendarioService.GetAgendaAsync( // Chama _calendarioService
            condominioId,
            mes,
            usuarioLogadoId,
            espacoComumId,
            status,
            unidadeId,
            isSindico,
            tipoItem); // Passa tipoItem
        return Ok(items);
    }

    /// <summary>
    /// Lista todos os espaços comuns disponíveis para reserva/agendamento no condomínio. (App)
    /// </summary>
    [HttpGet("app/reservas/espacos-comuns")] // Rota mantida
    [Authorize(Roles = "Sindico,Morador")]
    public async Task<ActionResult<IEnumerable<EspacoComumDto>>> ListarEspacosComuns()
    {
        var condominioIdClaim = User.FindFirstValue("condominioId");
        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("CondominioId não encontrado ou inválido no token.");
        }

        var espacos = await _calendarioService.ListarEspacosComunsAsync(condominioId); // Chama _calendarioService
        return Ok(espacos);
    }


    /// <summary>
    /// Obtém detalhes de um item específico do calendário (reserva, evento, etc.). (App)
    /// </summary>
    [HttpGet("app/reservas/{id:guid}")] // Rota mantida, id refere-se a um CalendarioItem
    [Authorize(Roles = "Sindico,Morador")]
    public async Task<ActionResult<CalendarioItemDto>> GetItemCalendarioPorId(Guid id) // Renomeado, Retorna CalendarioItemDto
    {
        var condominioIdClaim = User.FindFirstValue("condominioId");
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId) ||
            string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid userId))
        {
            return Unauthorized("CondominioId ou UserId não encontrado ou inválido no token.");
        }

        bool isSindico = User.IsInRole("Sindico");
        var itemDto = await _calendarioService.GetByIdAsync(id, condominioId, userId, isSindico); // Chama _calendarioService

        if (itemDto == null) return NotFound("Item do calendário não encontrado ou acesso não permitido.");
        return Ok(itemDto);
    }

    /// <summary>
    /// Cria uma nova solicitação de item no calendário (reserva, evento, etc.). (App)
    /// </summary>
    [HttpPost("app/reservas")] // Rota mantida
    [Authorize(Roles = "Sindico,Morador")]
    public async Task<ActionResult<CalendarioItemDto>> SolicitarItemCalendario([FromBody] CalendarioItemInputDto inputDto) // Recebe e Retorna CalendarioItemDto/InputDto
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
            var itemDto = await _calendarioService.SolicitarAsync(condominioId, usuarioId, inputDto); // Chama _calendarioService
            if (itemDto == null)
                return StatusCode(500, "Erro ao criar item no calendário.");
            return CreatedAtAction(nameof(GetItemCalendarioPorId), new { id = itemDto.Id }, itemDto); // Referencia GetItemCalendarioPorId
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
    /// Cancela um item do calendário (reserva, evento, etc.). (App)
    /// </summary>
    [HttpDelete("app/reservas/{id:guid}")] // Rota mantida
    [HttpPost("app/reservas/{id:guid}/cancelar")] // Rota mantida
    [Authorize(Roles = "Sindico,Morador")]
    public async Task<IActionResult> CancelarItemCalendario(Guid id) // Renomeado
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
            var sucesso = await _calendarioService.CancelarAsync(id, condominioId, usuarioId, isSindico); // Chama _calendarioService
            if (!sucesso)
            {
                return NotFound(new { error = "CANCEL_FAILED", message = "Item do calendário não encontrado ou não pôde ser cancelado." });
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
    /// (App) Lista itens do calendário em formato paginado.
    /// </summary>
    [HttpGet("app/reservas/lista")] // Rota mantida
    [Authorize(Roles = "Sindico,Morador")]
    public async Task<ActionResult<PaginatedResultDto<CalendarioItemDto>>> ListarItensCalendarioPaginados([FromQuery] CalendarioItemFilterDto filters) // Recebe e Retorna CalendarioItemDto/FilterDto
    {
        var condominioIdClaim = User.FindFirstValue("condominioId");
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId) ||
            string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid usuarioId))
        {
            return Unauthorized("CondominioId ou UserId não encontrado ou inválido no token.");
        }

        bool isSindico = User.IsInRole("Sindico");
        var result = await _calendarioService.ListarItensCalendarioListViewAsync(condominioId, usuarioId, filters, isSindico); // Chama _calendarioService
        return Ok(result);
    }

    /// <summary>
    /// (App) Lista os itens do calendário do usuário logado (Minhas Reservas / Meus Agendamentos).
    /// </summary>
    [HttpGet("app/reservas/minhas"), HttpGet("app/reservas/minhas-reservas")] // Rota mantida
    [Authorize(Roles = "Sindico,Morador")]
    public async Task<ActionResult<IEnumerable<CalendarioItemDto>>> ListarMeusItensCalendario([ // Renomeado, Retorna CalendarioItemDto
        FromQuery] Guid? espacoComumId,
        [FromQuery] string? status,
        [FromQuery] DateTime? periodoInicio,
        [FromQuery] DateTime? periodoFim,
        [FromQuery] string? tipoItem) // Novo filtro
    {
        var condominioIdClaim = User.FindFirstValue("condominioId");
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId) ||
            string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid usuarioId))
        {
            return Unauthorized("CondominioId ou UserId não encontrado ou inválido no token.");
        }

        var itens = await _calendarioService.ListarMeusItensCalendarioAsync( // Chama _calendarioService
            condominioId,
            usuarioId,
            espacoComumId,
            status,
            periodoInicio,
            periodoFim,
            tipoItem); // Passa tipoItem
        return Ok(itens);
    }

    // --- Endpoints de Gestão de Itens do Calendário para Síndico ---

    /// <summary>
    /// (Síndico) Aprova, recusa ou modifica o status de um item do calendário.
    /// </summary>
    [HttpPut("syndic/reservas/{id:guid}/status")] // Rota mantida
    [Authorize(Roles = "Sindico")]
    public async Task<ActionResult<CalendarioItemDto>> SyndicAtualizarStatusItemCalendario(Guid id, [FromBody] CalendarioItemStatusUpdateDto updateDto) // Recebe e Retorna CalendarioItemDto/StatusUpdateDto
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
            var itemAtualizadoDto = await _calendarioService.AtualizarStatusAsync(id, condominioId, sindicoUserId, updateDto); // Chama _calendarioService
            return Ok(itemAtualizadoDto);
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
    /// (Síndico) Lista todos os itens do calendário do condomínio com filtros e paginação.
    /// </summary>
    [HttpGet("syndic/reservas")] // Rota mantida
    [Authorize(Roles = "Sindico")]
    public async Task<ActionResult<PaginatedResultDto<CalendarioItemDto>>> SyndicListarTodosItensCalendario([FromQuery] CalendarioItemFilterDto filters) // Recebe e Retorna CalendarioItemDto/FilterDto
    {
        var condominioIdClaim = User.FindFirstValue("condominioId");
        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("CondominioId não encontrado ou inválido no token.");
        }

        var paginatedResult = await _calendarioService.ListarTodosItensCalendarioAsync(condominioId, filters); // Chama _calendarioService
        return Ok(paginatedResult);
    }

    /// <summary>
    /// (Síndico) Edita um item existente no calendário.
    /// </summary>
    [HttpPut("syndic/reservas/{id:guid}/editar")] // Rota mantida
    [Authorize(Roles = "Sindico")]
    public async Task<ActionResult<CalendarioItemDto>> SyndicEditarItemCalendario(Guid id, [FromBody] CalendarioItemInputDto inputDto) // Recebe e Retorna CalendarioItemDto/InputDto
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
            // No ReservaService era EditarReservaAsync, agora será EditarCalendarioItemAsync
            var itemAtualizadoDto = await _calendarioService.EditarCalendarioItemAsync(id, condominioId, sindicoUserId, inputDto); // Chama _calendarioService
            return Ok(itemAtualizadoDto);
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


    // --- Endpoints de Gestão de Espaços Comuns para Síndico (Mantidos como estavam, pois EspacoComum é uma entidade separada) ---

    /// <summary>
    /// (Síndico) Lista todos os espaços comuns do condomínio (incluindo suas regras).
    /// </summary>
    [HttpGet("syndic/reservas/espacos-comuns")] // Rota mantida
    [Authorize(Roles = "Sindico")]
    public async Task<ActionResult<IEnumerable<EspacoComumDto>>> SyndicListarEspacosComuns()
    {
        var condominioIdClaim = User.FindFirstValue("condominioId");
        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("CondominioId não encontrado ou inválido no token.");
        }
        var espacos = await _calendarioService.ListarEspacosComunsAsync(condominioId); // Chama _calendarioService
        return Ok(espacos);
    }

    /// <summary>
    /// (Síndico) Obtém detalhes de um espaço comum específico.
    /// </summary>
    [HttpGet("syndic/reservas/espacos-comuns/{id:guid}")] // Rota mantida
    [Authorize(Roles = "Sindico")]
    public async Task<ActionResult<EspacoComumDto>> SyndicGetEspacoComumPorId(Guid id)
    {
        var condominioIdClaim = User.FindFirstValue("condominioId");
        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("CondominioId não encontrado ou inválido no token.");
        }
        var espacoDto = await _calendarioService.GetEspacoComumByIdAsync(id, condominioId); // Chama _calendarioService
        if (espacoDto == null) return NotFound("Espaço comum não encontrado.");
        return Ok(espacoDto);
    }

    /// <summary>
    /// (Síndico) Cria um novo espaço comum.
    /// </summary>
    [HttpPost("syndic/reservas/espacos-comuns")] // Rota mantida
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
            var espacoCriadoDto = await _calendarioService.CriarEspacoComumAsync(condominioId, inputDto); // Chama _calendarioService
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
    [HttpPut("syndic/reservas/espacos-comuns/{id:guid}")] // Rota mantida
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

            var espacoAtualizadoDto = await _calendarioService.AtualizarEspacoComumAsync(id, condominioId, inputDto); // Chama _calendarioService
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
    [HttpDelete("syndic/reservas/espacos-comuns/{id:guid}")] // Rota mantida
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
            var sucesso = await _calendarioService.ExcluirEspacoComumAsync(id, condominioId); // Chama _calendarioService
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
            Console.Error.WriteLine(ex);
            return StatusCode(500, new { error = "INTERNAL_ERROR", message = "Erro ao excluir espaço comum." });
        }
    }
}
