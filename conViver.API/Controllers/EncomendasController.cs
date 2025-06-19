using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using conViver.Application;
using conViver.Core.Entities;
using conViver.Core.DTOs;
using System.Security.Claims;
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

    private Guid GetUserId()
    {
        var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var id))
            throw new UnauthorizedAccessException("Usuário não identificado");
        return id;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Encomenda>>> Listar([FromQuery] string? status)
    {
        var items = await _encomendas.ListarAsync(status);
        return Ok(items);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Encomenda>> Obter(Guid id)
    {
        var item = await _encomendas.ObterPorIdAsync(id);
        if (item == null) return NotFound();
        return Ok(item);
    }

    [HttpPost]
    public async Task<ActionResult<Encomenda>> Receber([FromBody] EncomendaInputDto dto)
    {
        var userId = GetUserId();
        var item = await _encomendas.RegistrarRecebimentoAsync(dto, userId);
        return CreatedAtAction(nameof(Obter), new { id = item.Id }, item);
    }

    [HttpPost("{id}/retirar")]
    public async Task<ActionResult<Encomenda>> Retirar(Guid id)
    {
        var userId = GetUserId();
        var item = await _encomendas.RegistrarRetiradaAsync(id, userId);
        if (item == null) return NotFound();
        return Ok(item);
    }
}
