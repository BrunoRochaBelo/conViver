using Microsoft.AspNetCore.Mvc;
using conViver.Core.Entities;

namespace conViver.API.Controllers;

[ApiController]
[Route("syndic/os")]
public class OrdensServicoController : ControllerBase
{
    private static readonly List<OrdemServico> Ordens = new();

    [HttpGet]
    public ActionResult<IEnumerable<OrdemServico>> GetAll()
        => Ok(Ordens);

    [HttpGet("{id}")]
    public ActionResult<OrdemServico> GetById(Guid id)
    {
        var os = Ordens.FirstOrDefault(o => o.Id == id);
        return os is null ? NotFound() : Ok(os);
    }

    public record CreateOrdemRequest(Guid UnidadeId, string? Descricao);

    [HttpPost]
    public ActionResult<OrdemServico> Create(CreateOrdemRequest request)
    {
        var os = new OrdemServico
        {
            Id = Guid.NewGuid(),
            UnidadeId = request.UnidadeId,
            Descricao = request.Descricao,
            CriadoEm = DateTime.UtcNow
        };
        Ordens.Add(os);
        return CreatedAtAction(nameof(GetById), new { id = os.Id }, os);
    }

    public record UpdateOrdemRequest(string Status);

    [HttpPut("{id}")]
    public ActionResult<OrdemServico> Update(Guid id, UpdateOrdemRequest request)
    {
        var os = Ordens.FirstOrDefault(o => o.Id == id);
        if (os == null) return NotFound();

        os.Status = request.Status;
        os.UpdatedAt = DateTime.UtcNow;
        if (request.Status == "concluida")
            os.ConcluidoEm = DateTime.UtcNow;

        return Ok(os);
    }
}

