using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using conViver.Application;
using conViver.Core.Entities;
using System.Collections.Generic;

namespace conViver.API.Controllers;

[ApiController]
[Route("syndic/visitantes")]
[Authorize(Roles = "Sindico")]
public class VisitantesController : ControllerBase
{
    private readonly VisitanteService _visitantes;

    public VisitantesController(VisitanteService visitantes)
    {
        _visitantes = visitantes;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Visitante>>> Listar([FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var items = await _visitantes.ListarAsync(from, to);
        return Ok(items);
    }
}
