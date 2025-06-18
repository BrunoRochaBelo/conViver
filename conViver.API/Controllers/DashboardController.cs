using Microsoft.AspNetCore.Mvc;
using conViver.Application.Services;
using conViver.Core.DTOs;
using Microsoft.AspNetCore.Authorization;
using System;
using System.Threading.Tasks;

namespace conViver.API.Controllers;

[ApiController]
[Route("api/v1/dashboard")] // Ajuste o prefixo da rota conforme o padrão do apiClient.js
[Authorize] // Requer autenticação. Defina Roles se necessário (ex: "Sindico,Administradora")
public class DashboardController : ControllerBase
{
    private readonly DashboardService _dashboardService;

    public DashboardController(DashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    [HttpGet("geral")]
    public async Task<ActionResult<DashboardGeralDto>> GetDashboardGeral()
    {
        // Obter condominioId ou userId do contexto do usuário (HttpContext.User)
        // Por agora, podemos passar um Guid mockado se necessário para o serviço.
        var condominioId = Guid.NewGuid(); // Substituir pela lógica real de obtenção do ID

        var dashboardData = await _dashboardService.GetDashboardGeralAsync(condominioId);
        if (dashboardData == null)
        {
            // This case might not happen with current mock data but good for future
            return NotFound(new { Message = "Dados do dashboard não encontrados." });
        }
        return Ok(dashboardData);
    }
}
