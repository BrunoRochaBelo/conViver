using conViver.Application.Services;
using conViver.Core.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace conViver.API.Controllers;

[ApiController]
[Route("/api/v1")]
[Authorize]
public class OcorrenciasController : ControllerBase
{
    private readonly OcorrenciaService _service;

    public OcorrenciasController(OcorrenciaService service)
    {
        _service = service;
    }

    [HttpPost("app/ocorrencias")]
    [Authorize(Roles = "Condomino,Inquilino,Sindico")]
    public async Task<ActionResult<OcorrenciaDto>> Criar([FromBody] OcorrenciaInputDto dto)
    {
        var condIdClaim = User.FindFirstValue("condominioId");
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(condIdClaim) || !Guid.TryParse(condIdClaim, out var condId) ||
            string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized();
        }
        var ent = await _service.CriarAsync(condId, userId, dto);
        var result = new OcorrenciaDto
        {
            Id = ent.Id,
            Categoria = ent.Categoria,
            Descricao = ent.Descricao,
            Local = ent.Local,
            UnidadeId = ent.UnidadeId,
            Status = ent.Status,
            DataRegistro = ent.DataRegistro,
            Fotos = ent.Fotos
        };
        return CreatedAtAction(nameof(Listar), null, result);
    }

    [HttpGet("syndic/ocorrencias")]
    [Authorize(Roles = "Sindico")]
    public async Task<ActionResult<IEnumerable<OcorrenciaDto>>> Listar()
    {
        var condIdClaim = User.FindFirstValue("condominioId");
        if (string.IsNullOrEmpty(condIdClaim) || !Guid.TryParse(condIdClaim, out var condId))
        {
            return Unauthorized();
        }
        var list = await _service.ListarPorCondominioAsync(condId);
        return Ok(list);
    }

    [HttpPut("syndic/ocorrencias/{id:guid}")]
    [Authorize(Roles = "Sindico")]
    public async Task<IActionResult> AtualizarStatus(Guid id, [FromBody] OcorrenciaStatusUpdateDto dto)
    {
        var ok = await _service.AtualizarStatusAsync(id, dto.Status);
        if (!ok) return NotFound();
        return NoContent();
    }
}
