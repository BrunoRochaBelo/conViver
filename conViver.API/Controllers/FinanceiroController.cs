using Microsoft.AspNetCore.Mvc;
using conViver.Core.Entities;
using conViver.Application.Services; // Corrected namespace
using Microsoft.AspNetCore.Authorization;
using conViver.Core.DTOs; // Added for DTOs
using System.Collections.Generic; // Added for IEnumerable
using System.Threading.Tasks; // Added for Task
using System; // Added for Guid

namespace conViver.API.Controllers;

[ApiController]
[Route("api/v1/financeiro")] // Changed route
[Authorize(Roles = "Sindico")]
public class FinanceiroController : ControllerBase
{
    private readonly FinanceiroService _financeiro;

    public FinanceiroController(FinanceiroService financeiro)
    {
        _financeiro = financeiro;
    }

    [HttpGet("cobrancas/dashboard")]
    public async Task<ActionResult<DashboardFinanceiroCobrancasDto>> GetDashboardCobrancas()
    {
        // TODO: Obter condominioId do contexto do usuário
        var condominioId = Guid.NewGuid(); // Placeholder
        var dashboardData = await _financeiro.GetDashboardCobrancasAsync(condominioId);
        if (dashboardData == null)
        {
            return NotFound("Dados do dashboard financeiro não encontrados.");
        }
        return Ok(dashboardData);
    }

    [HttpGet("cobrancas")]
    public async Task<ActionResult<IEnumerable<CobrancaDto>>> GetCobrancas([FromQuery] string? status)
    {
        // TODO: Obter condominioId do contexto do usuário ou similar para filtrar cobranças
        var condominioId = Guid.NewGuid(); // Placeholder
        var itens = await _financeiro.ListarCobrancasAsync(condominioId, status);
        return Ok(itens);
    }

    [HttpGet("cobrancas/{id}")]
    public async Task<ActionResult<CobrancaDto>> GetCobranca(Guid id)
    {
        var cobranca = await _financeiro.GetCobrancaByIdAsync(id);
        if (cobranca == null) return NotFound();
        return Ok(cobranca);
    }

    [HttpPost("cobrancas")]
    public async Task<ActionResult<CobrancaDto>> CreateCobranca([FromBody] NovaCobrancaDto request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }
        try
        {
            // TODO: Obter condominioId/userId do contexto para associar a cobrança
            var condominioId = Guid.NewGuid(); // Placeholder
            var cobranca = await _financeiro.CriarCobrancaAsync(condominioId, request);
            return CreatedAtAction(nameof(GetCobranca), new { id = cobranca.Id }, cobranca);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = "INVALID_OPERATION", message = ex.Message });
        }
        catch (Exception ex)
        {
            // Log exception (ex)
            return StatusCode(500, "Ocorreu um erro interno ao criar a cobrança.");
        }
    }

    [HttpPost("cobrancas/gerar-lote")]
    public async Task<ActionResult<ResultadoOperacaoDto>> GerarCobrancasEmLote([FromBody] GeracaoLoteRequestDto request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }
        // TODO: Obter condominioId do contexto do usuário
        var condominioId = Guid.NewGuid(); // Placeholder
        var resultado = await _financeiro.GerarCobrancasEmLoteAsync(condominioId, request);
        if (!resultado.Sucesso)
        {
            return BadRequest(resultado);
        }
        return Ok(resultado);
    }

    [HttpGet("cobrancas/{id}/segunda-via")]
    public async Task<ActionResult<string>> GetSegundaVia(Guid id)
    {
        try
        {
            var link = await _financeiro.ObterLinkSegundaViaAsync(id);
            if (string.IsNullOrEmpty(link))
            {
                return NotFound("Link para segunda via não encontrado ou não aplicável.");
            }
            // Pode ser um JSON com o link ou um redirecionamento, dependendo da implementação.
            // Por simplicidade, retornando o link como string.
            return Ok(new { url = link });
        }
        catch (Exception ex)
        {
            // Log exception (ex)
            return StatusCode(500, "Erro ao obter link da segunda via.");
        }
    }

    [HttpPut("cobrancas/{id}/cancelar")] // Route updated
    public async Task<ActionResult> CancelarCobranca(Guid id) // Method name updated
    {
        try
        {
            var resultado = await _financeiro.CancelarCobrancaAsync(id);
            if (!resultado.Sucesso)
            {
                return BadRequest(resultado); // Ou Conflict se for o caso
            }
            return Ok(resultado);
        }
        catch (InvalidOperationException ex) // Específico para regras de negócio como "boleto pago"
        {
            return Conflict(new { error = "INVALID_OPERATION", message = ex.Message });
        }
        catch (Exception ex)
        {
             // Log exception (ex)
            return StatusCode(500, "Erro ao cancelar a cobrança.");
        }
    }
}

