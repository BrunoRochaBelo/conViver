using Microsoft.AspNetCore.Mvc;
using conViver.Core.Entities;
using conViver.Application;

namespace conViver.API.Controllers;

[ApiController]
[Route("syndic/os")]
public class OrdensServicoController : ControllerBase
{
    private readonly OrdemServicoService _ordens;

    public OrdensServicoController(OrdemServicoService ordens)
    {
        _ordens = ordens;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<OrdemServico>>> GetAll()
        => Ok(await _ordens.GetAllAsync());

    [HttpGet("{id}")]
    public async Task<ActionResult<OrdemServico?>> GetById(Guid id)
    {
        var os = await _ordens.GetByIdAsync(id);
        return os is null ? NotFound() : Ok(os);
    }

    public record CreateOrdemRequest(Guid UnidadeId, string? Descricao);

    [HttpPost]
    public async Task<ActionResult<OrdemServico>> Create(CreateOrdemRequest request)
    {
        var os = await _ordens.CriarAsync(request.UnidadeId, request.Descricao);
        return CreatedAtAction(nameof(GetById), new { id = os.Id }, os);
    }

    public record UpdateOrdemRequest(string Status);

    [HttpPut("{id}")]
    public async Task<ActionResult> Update(Guid id, UpdateOrdemRequest request)
    {
        try
        {
            await _ordens.AtualizarStatusAsync(id, request.Status);
            return Ok();
        }
        catch (InvalidOperationException)
        {
            return NotFound();
        }
    }
}

