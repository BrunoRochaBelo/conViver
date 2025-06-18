using Microsoft.AspNetCore.Mvc;
using conViver.Core.Entities;
using conViver.Core.DTOs;

namespace conViver.API.Controllers;

[ApiController]
[Route("api/v1/adm/condominios")]
public class CondominiosController : ControllerBase
{
    private static readonly List<Condominio> Condos = new();

    [HttpGet]
    public ActionResult<IEnumerable<CondominioDto>> GetAll()
    {
        return Ok(Condos.Select(c => new CondominioDto { Id = c.Id, Nome = c.Nome }));
    }

    [HttpGet("{id}")]
    public ActionResult<CondominioDto> GetById(Guid id)
    {
        var c = Condos.FirstOrDefault(x => x.Id == id);
        if (c == null) return NotFound();
        return Ok(new CondominioDto { Id = c.Id, Nome = c.Nome });
    }

    [HttpPost]
    public ActionResult<CondominioDto> Create(CreateCondominioRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Nome))
        {
            return UnprocessableEntity(new { error = "VALIDATION_ERROR" });
        }

        var cond = new Condominio { Id = Guid.NewGuid(), Nome = request.Nome };
        Condos.Add(cond);
        return CreatedAtAction(nameof(GetById), new { id = cond.Id }, new CondominioDto { Id = cond.Id, Nome = cond.Nome });
    }
}
