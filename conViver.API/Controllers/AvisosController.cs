using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using conViver.Application;
using conViver.Core.Entities;
using System.Collections.Generic;

namespace conViver.API.Controllers;

[ApiController]
[Route("app/avisos")]
[Authorize]
public class AvisosController : ControllerBase
{
    private readonly AvisoService _avisos;

    public AvisosController(AvisoService avisos)
    {
        _avisos = avisos;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Aviso>>> Listar([FromQuery] int page = 1, [FromQuery] int size = 10)
    {
        // TODO: obter condominioId do usuário
        var condominioId = Guid.NewGuid();
        var items = await _avisos.ListarAsync(condominioId);
        var paged = items.Skip((page - 1) * size).Take(size);
        return Ok(paged);
    }
}
