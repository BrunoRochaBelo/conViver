using Microsoft.AspNetCore.Mvc;
using conViver.Core.Entities;

namespace conViver.API.Controllers;

[ApiController]
[Route("syndic/finance")]
public class FinanceiroController : ControllerBase
{
    private static readonly List<Boleto> Boletos = new();

    [HttpGet("boletos")]
    public ActionResult<IEnumerable<Boleto>> GetBoletos([FromQuery] string? status)
    {
        var query = Boletos.AsEnumerable();
        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(b => b.Status.Equals(status, StringComparison.OrdinalIgnoreCase));
        }
        return Ok(query);
    }

    [HttpGet("boletos/{id}")]
    public ActionResult<Boleto> GetBoleto(Guid id)
    {
        var boleto = Boletos.FirstOrDefault(b => b.Id == id);
        if (boleto == null) return NotFound();
        return Ok(boleto);
    }

    public record CreateBoletoRequest(Guid UnidadeId, decimal Valor, DateTime DataVencimento);

    [HttpPost("boletos")]
    public ActionResult<Boleto> CreateBoleto(CreateBoletoRequest request)
    {
        if (request.DataVencimento.Date < DateTime.UtcNow.Date.AddDays(3))
        {
            return BadRequest(new { error = "INVALID_DUE_DATE" });
        }

        var boleto = new Boleto
        {
            Id = Guid.NewGuid(),
            UnidadeId = request.UnidadeId,
            Valor = request.Valor,
            DataVencimento = request.DataVencimento.Date,
            NossoNumero = Guid.NewGuid().ToString("N").Substring(0, 10),
            CodigoBanco = "999",
            Status = "gerado"
        };

        Boletos.Add(boleto);
        return CreatedAtAction(nameof(GetBoleto), new { id = boleto.Id }, boleto);
    }

    [HttpPut("boletos/{id}/cancel")]
    public ActionResult Cancel(Guid id)
    {
        var boleto = Boletos.FirstOrDefault(b => b.Id == id);
        if (boleto == null) return NotFound();
        if (boleto.Status == "pago") return Conflict(new { error = "BOLETO_PAID" });

        boleto.Status = "cancelado";
        boleto.UpdatedAt = DateTime.UtcNow;
        return Ok(boleto);
    }
}

