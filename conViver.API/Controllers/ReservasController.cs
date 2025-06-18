using Microsoft.AspNetCore.Mvc;
using conViver.Core.Entities;

namespace conViver.API.Controllers;

[ApiController]
[Route("app/reservas")]
public class ReservasController : ControllerBase
{
    private static readonly List<Reserva> Reservas = new();

    [HttpGet("agenda")]
    public ActionResult<IEnumerable<Reserva>> Agenda([FromQuery] string mesAno)
    {
        if (!DateTime.TryParse($"{mesAno}-01", out var mes))
            return BadRequest(new { error = "INVALID_DATE" });

        var items = Reservas.Where(r => r.Inicio.Month == mes.Month && r.Inicio.Year == mes.Year);
        return Ok(items);
    }

    [HttpGet("{id}")]
    public ActionResult<Reserva> GetById(Guid id)
    {
        var reserva = Reservas.FirstOrDefault(r => r.Id == id);
        return reserva is null ? NotFound() : Ok(reserva);
    }

    public record CreateReservaRequest(Guid UnidadeId, string Area, DateTime Inicio, DateTime Fim);

    [HttpPost]
    public ActionResult<Reserva> Criar(CreateReservaRequest request)
    {
        var reserva = new Reserva
        {
            Id = Guid.NewGuid(),
            UnidadeId = request.UnidadeId,
            Area = request.Area,
            Inicio = request.Inicio,
            Fim = request.Fim
        };
        Reservas.Add(reserva);
        return CreatedAtAction(nameof(GetById), new { id = reserva.Id }, reserva);
    }

    public record UpdateReservaRequest(string Status);

    [HttpPut("{id}")]
    public ActionResult<Reserva> Atualizar(Guid id, UpdateReservaRequest request)
    {
        var reserva = Reservas.FirstOrDefault(r => r.Id == id);
        if (reserva == null) return NotFound();

        reserva.Status = request.Status;
        reserva.UpdatedAt = DateTime.UtcNow;
        return Ok(reserva);
    }

    [HttpDelete("{id}")]
    public IActionResult Delete(Guid id)
    {
        var reserva = Reservas.FirstOrDefault(r => r.Id == id);
        if (reserva == null) return NotFound();
        Reservas.Remove(reserva);
        return NoContent();
    }
}

