using Microsoft.AspNetCore.Mvc;
using conViver.Core.Entities;
using conViver.Core.DTOs;
using conViver.Application;

namespace conViver.API.Controllers;

[ApiController]
[Route("adm/condominios")]
public class CondominiosController : ControllerBase
{
    private readonly CondominioService _condos;

    public CondominiosController(CondominioService condos)
    {
        _condos = condos;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<CondominioDto>>> GetAll()
    {
        var items = await _condos.GetAllAsync();
        return Ok(items);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<CondominioDto?>> GetById(Guid id)
    {
        var c = await _condos.GetByIdAsync(id);
        if (c == null) return NotFound();
        return Ok(new CondominioDto { Id = c.Id, Nome = c.Nome });
    }

    [HttpPost]
    public async Task<ActionResult<CondominioDto>> Create(CreateCondominioRequest request)
    {
        var dto = await _condos.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = dto.Id }, dto);
    }
}
