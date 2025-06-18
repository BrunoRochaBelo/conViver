using Microsoft.AspNetCore.Mvc;
using conViver.Core.Entities;
using conViver.Application;

namespace conViver.API.Controllers;

[ApiController]
[Route("syndic/finance")]
public class FinanceiroController : ControllerBase
{
    private readonly FinanceiroService _financeiro;

    public FinanceiroController(FinanceiroService financeiro)
    {
        _financeiro = financeiro;
    }

    [HttpGet("boletos")]
    public async Task<ActionResult<IEnumerable<Boleto>>> GetBoletos([FromQuery] string? status)
    {
        var itens = await _financeiro.ListarAsync(status);
        return Ok(itens);
    }

    [HttpGet("boletos/{id}")]
    public async Task<ActionResult<Boleto?>> GetBoleto(Guid id)
    {
        var boleto = await _financeiro.GetByIdAsync(id);
        if (boleto == null) return NotFound();
        return Ok(boleto);
    }

    public record CreateBoletoRequest(Guid UnidadeId, decimal Valor, DateTime DataVencimento);

    [HttpPost("boletos")]
    public async Task<ActionResult<Boleto>> CreateBoleto(CreateBoletoRequest request)
    {
        try
        {
            var boleto = await _financeiro.CriarBoletoAsync(request.UnidadeId, request.Valor, request.DataVencimento);
            return CreatedAtAction(nameof(GetBoleto), new { id = boleto.Id }, boleto);
        }
        catch (InvalidOperationException)
        {
            return BadRequest(new { error = "INVALID_DUE_DATE" });
        }
    }

    [HttpPut("boletos/{id}/cancel")]
    public async Task<ActionResult> Cancel(Guid id)
    {
        try
        {
            await _financeiro.CancelarAsync(id);
            return Ok();
        }
        catch (InvalidOperationException)
        {
            return Conflict(new { error = "BOLETO_PAID" });
        }
    }
}

