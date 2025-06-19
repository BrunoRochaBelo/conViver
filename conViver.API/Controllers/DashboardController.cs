using Microsoft.AspNetCore.Mvc;
using conViver.Application.Services;
using conViver.Core.DTOs;
using Microsoft.AspNetCore.Authorization;
using System;
using System.Threading.Tasks;
using System.Security.Claims; // Added for ClaimTypes

namespace conViver.API.Controllers;

[ApiController]
[Route("api/v1")] // Rota base da API, endpoints específicos definirão o resto.
[Authorize(Roles = "Sindico")] // Autorização a nível de controller, ajustada para Síndico.
public class DashboardController : ControllerBase
{
    private readonly DashboardService _dashboardService;

    public DashboardController(DashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    /// <summary>
    /// Obtém os dados consolidados para o dashboard geral do síndico.
    /// </summary>
    /// <remarks>
    /// Este endpoint provê um resumo das informações chave do condomínio,
    /// como inadimplência, saldo, próximas despesas, alertas, últimos chamados e avisos.
    /// </remarks>
    /// <returns>Os dados do dashboard geral.</returns>
    /// <response code="200">Retorna os dados do dashboard.</response>
    /// <response code="401">Usuário não autorizado ou CondominioId inválido no token.</response>
    /// <response code="403">Usuário não possui a role 'Sindico'.</response>
    /// <response code="404">Dados do dashboard não encontrados para o condomínio.</response>
    [HttpGet("syndic/reports/dashboard")] // Rota alinhada com API_REFERENCE.md (Sec 13.3)
    public async Task<ActionResult<DashboardGeralDto>> GetDashboardGeral()
    {
        var condominioIdClaim = User.FindFirstValue("condominioId");
        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("CondominioId não encontrado ou inválido no token.");
        }

        var dashboardData = await _dashboardService.GetDashboardGeralAsync(condominioId);
        if (dashboardData == null)
        {
            // This case might not happen with current mock data but good for future
            return NotFound(new { Message = "Dados do dashboard não encontrados." });
        }
        return Ok(dashboardData);
    }
}
