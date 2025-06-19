using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using conViver.Application;
using conViver.Core.Entities;
using System.Collections.Generic;

namespace conViver.API.Controllers;

[ApiController]
[Route("syndic/encomendas")]
[Authorize(Roles = "Sindico")]
public class EncomendasController : ControllerBase
{
    private readonly EncomendaService _encomendas;

    public EncomendasController(EncomendaService encomendas)
    {
        _encomendas = encomendas;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Encomenda>>> Listar([FromQuery] string? status)
    {
        var items = await _encomendas.ListarAsync(status);
        return Ok(items);
    }
}
