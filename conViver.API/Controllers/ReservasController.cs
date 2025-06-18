using Microsoft.AspNetCore.Mvc;
using conViver.Core.Entities;
using conViver.Application;
using Microsoft.AspNetCore.Authorization;

namespace conViver.API.Controllers;

[ApiController]
[Route("app/reservas")]
[Authorize]
public class ReservasController : ControllerBase
{
    private readonly ReservaService _reservas;

    public ReservasController(ReservaService reservas)
    {
        _reservas = reservas;
    }

    [HttpGet("agenda")]
    public async Task<ActionResult<IEnumerable<Reserva>>> Agenda([FromQuery] string mesAno)
    {
        if (!DateTime.TryParse($"{mesAno}-01", out var mes))
            return BadRequest(new { error = "INVALID_DATE" });

        var items = await _reservas.AgendaAsync(mes);
        return Ok(items);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Reserva?>> GetById(Guid id)
    {
        var reserva = await _reservas.AgendaAsync(DateTime.UtcNow);
        var item = reserva.FirstOrDefault(r => r.Id == id);
        return item is null ? NotFound() : Ok(item);
    }

    public record CreateReservaRequest(Guid UnidadeId, string Area, DateTime Inicio, DateTime Fim);

    [HttpPost]
    public async Task<ActionResult<Reserva>> Criar(CreateReservaRequest request)
    {
        var reserva = await _reservas.CriarAsync(request.UnidadeId, request.Area, request.Inicio, request.Fim);
        return CreatedAtAction(nameof(GetById), new { id = reserva.Id }, reserva);
    }

    public record UpdateReservaRequest(string Status);

    [HttpPut("{id}")]
    public async Task<ActionResult> Atualizar(Guid id, UpdateReservaRequest request)
    {
        try
        {
            await _reservas.AtualizarStatusAsync(id, request.Status);
            return Ok();
        }
        catch (InvalidOperationException)
        {
            return NotFound();
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _reservas.ExcluirAsync(id);
        return NoContent();
    }
}

