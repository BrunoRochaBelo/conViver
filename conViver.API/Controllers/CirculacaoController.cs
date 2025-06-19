using conViver.Application.Services;
using conViver.Core.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace conViver.API.Controllers;

[ApiController]
[Route("/api/v1")]
[Authorize]
public class CirculacaoController : ControllerBase
{
    private readonly CirculacaoService _service;

    public CirculacaoController(CirculacaoService service)
    {
        _service = service;
    }

    [HttpPost("app/circulacoes")]
    [Authorize(Roles = "Condomino,Inquilino,Sindico")]
    public async Task<ActionResult<CirculacaoDto>> CriarSolicitacao([FromBody] CirculacaoInputDto dto)
    {
        var condIdClaim = User.FindFirstValue("condominioId");
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(condIdClaim) || !Guid.TryParse(condIdClaim, out var condId) ||
            string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized();
        }
        var ent = await _service.CriarAsync(condId, userId, dto);
        var result = new CirculacaoDto
        {
            Id = ent.Id,
            UnidadeId = ent.UnidadeId,
            PrestadorServicoId = ent.PrestadorServicoId,
            NomePrestador = ent.NomePrestador,
            TipoServico = ent.TipoServico,
            DataEntradaPrevista = ent.DataEntradaPrevista,
            DataSaidaPrevista = ent.DataSaidaPrevista,
            ImpactoColetivo = ent.ImpactoColetivo,
            Aprovado = ent.Aprovado,
            Cancelado = ent.Cancelado,
            ChegadaConfirmada = ent.ChegadaConfirmada,
            Observacoes = ent.Observacoes
        };
        return CreatedAtAction(nameof(ListarSolicitacoes), null, result);
    }

    [HttpGet("syndic/circulacoes")]
    [Authorize(Roles = "Sindico,Porteiro")]
    public async Task<ActionResult<IEnumerable<CirculacaoDto>>> ListarSolicitacoes()
    {
        var condIdClaim = User.FindFirstValue("condominioId");
        if (string.IsNullOrEmpty(condIdClaim) || !Guid.TryParse(condIdClaim, out var condId))
        {
            return Unauthorized();
        }
        var list = await _service.ListarPorCondominioAsync(condId);
        return Ok(list);
    }

    [HttpPut("syndic/circulacoes/{id:guid}/aprovar")]
    [Authorize(Roles = "Sindico")]
    public async Task<IActionResult> Aprovar(Guid id)
    {
        var ok = await _service.AtualizarStatusAsync(id, aprovado: true);
        if (!ok) return NotFound();
        return NoContent();
    }

    [HttpPut("porteiro/circulacoes/{id:guid}/chegada")]
    [Authorize(Roles = "Porteiro")]
    public async Task<IActionResult> ConfirmarChegada(Guid id)
    {
        var ok = await _service.AtualizarStatusAsync(id, chegada: true);
        if (!ok) return NotFound();
        return NoContent();
    }
}
