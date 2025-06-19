using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using conViver.Application;
using conViver.Core.DTOs; // Added
using conViver.Core.Enums; // Added
using System; // Added
using System.Collections.Generic;
using System.Threading; // Added
using System.Threading.Tasks; // Added
using System.Security.Claims; // Added for NameIdentifier
using System.Linq; // Added for Linq methods like .Any() and .ToList()
using conViver.Core.Interfaces; // Added for IUsuarioService

namespace conViver.API.Controllers;

[ApiController]
[Route("api/visitantes")] // Changed route to be more generic, specific roles will protect endpoints
// [Authorize(Roles = "Sindico")] // Removed default authorization, will be per-endpoint
public class VisitantesController : ControllerBase
{
    private readonly VisitanteService _visitanteService;
    private readonly IUsuarioService _usuarioService; // Added

    public VisitantesController(VisitanteService visitanteService, IUsuarioService usuarioService) // Modified
    {
        _visitanteService = visitanteService;
        _usuarioService = usuarioService; // Added
    }

    private Guid GetAuthenticatedUserId()
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid userId))
        {
            // This should ideally not happen if [Authorize] is effective.
            // Consider logging this attempt or throwing a more specific internal server error
            // if the claim is expected but missing/invalid for an authenticated user.
            throw new UnauthorizedAccessException("Não foi possível identificar o usuário autenticado.");
        }
        return userId;
    }

    [HttpGet("historico")]
    [Authorize(Roles = "Sindico,Administrador,Porteiro")]
    public async Task<ActionResult<IEnumerable<VisitanteDto>>> ListarHistoricoVisitantes(
        [FromQuery] Guid? unidadeId,
        [FromQuery] DateTime? inicio,
        [FromQuery] DateTime? fim,
        [FromQuery] string? nomeVisitante,
        CancellationToken ct)
    {
        // TODO: Add logic here if a Condomino is accessing, to restrict unidadeId to their own.
        // For now, keeping it general for Sindico/Admin/Porteiro.
        var items = await _visitanteService.ListarHistoricoVisitantesAsync(unidadeId, inicio, fim, nomeVisitante, ct);
        return Ok(items);
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "Sindico,Administrador,Porteiro,Condomino")]
    public async Task<ActionResult<VisitanteDto>> ObterVisitantePorId(Guid id, CancellationToken ct)
    {
        var visitante = await _visitanteService.ObterVisitantePorIdAsync(id, ct);
        if (visitante == null)
        {
            return NotFound($"Visitante com ID {id} não encontrado.");
        }

        if (User.IsInRole("Condomino"))
        {
            var authenticatedUserId = GetAuthenticatedUserId();
            var userUnidadeIds = await _usuarioService.GetUnidadesIdDoUsuarioAsync(authenticatedUserId, ct);

            if (!userUnidadeIds.Contains(visitante.UnidadeId) && visitante.PreAutorizadoPorCondominoId != authenticatedUserId)
            {
                return Forbid("Você não tem permissão para ver detalhes deste visitante.");
            }
        }
        return Ok(visitante);
    }

    [HttpPost("registrar-entrada")]
    [Authorize(Roles = "Porteiro,Administrador")]
    public async Task<ActionResult<VisitanteDto>> RegistrarEntrada([FromBody] VisitanteInputDto inputDto, CancellationToken ct)
    {
        var responsavelId = GetAuthenticatedUserId();
        try
        {
            var visitanteDto = await _visitanteService.RegistrarEntradaAsync(inputDto, responsavelId, ct);
            // The service should throw exceptions for validation errors (e.g. ArgumentException for non-existent UnidadeId)
            // If it returns null for other reasons, it's an issue.
            // Assuming successful creation means non-null DTO.
            return CreatedAtAction(nameof(ObterVisitantePorId), new { id = visitanteDto.Id }, visitanteDto);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception) // Removed 'ex'
        {
            // Generic error handler for unexpected issues
            // Log the exception ex (TODO: Add actual logging)
            return StatusCode(500, new { message = "Ocorreu um erro interno ao registrar a entrada." });
        }
    }

    [HttpPost("{id}/registrar-saida")]
    [Authorize(Roles = "Porteiro,Administrador")]
    public async Task<ActionResult<VisitanteDto>> RegistrarSaida(Guid id, CancellationToken ct)
    {
        var responsavelId = GetAuthenticatedUserId();
        try
        {
            var visitanteDto = await _visitanteService.RegistrarSaidaAsync(id, responsavelId, ct);
            if (visitanteDto == null)
            {
                return NotFound($"Visitante com ID {id} não encontrado ou já registrou saída.");
            }
            return Ok(visitanteDto);
        }
        catch (InvalidOperationException ex) // Example: if service throws for "already exited"
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception) // Removed 'ex'
        {
            // Log ex (TODO: Add actual logging)
            return StatusCode(500, new { message = "Ocorreu um erro interno ao registrar a saída." });
        }
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Porteiro,Administrador")]
    public async Task<ActionResult<VisitanteDto>> AtualizarDadosVisitante(Guid id, [FromBody] VisitanteUpdateDto updateDto, CancellationToken ct)
    {
        var responsavelId = GetAuthenticatedUserId();
        try
        {
            var visitanteDto = await _visitanteService.AtualizarDadosVisitanteAsync(id, updateDto, responsavelId, ct);
            if (visitanteDto == null)
            {
                return NotFound($"Visitante com ID {id} não encontrado.");
            }
            return Ok(visitanteDto);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception) // Removed 'ex'
        {
            // Log ex (TODO: Add actual logging)
            return StatusCode(500, new { message = "Ocorreu um erro interno ao atualizar os dados do visitante." });
        }
    }

    [HttpGet("atuais")]
    [Authorize(Roles = "Sindico,Administrador,Porteiro,Condomino")]
    public async Task<ActionResult<IEnumerable<VisitanteDto>>> ListarVisitantesAtuais([FromQuery] Guid? unidadeId, CancellationToken ct)
    {
        Guid? idParaFiltrar = unidadeId;
        if (User.IsInRole("Condomino"))
        {
            var authenticatedUserId = GetAuthenticatedUserId();
            var userUnidadeIds = (await _usuarioService.GetUnidadesIdDoUsuarioAsync(authenticatedUserId, ct)).ToList();

            if (!userUnidadeIds.Any())
            {
                return Ok(Enumerable.Empty<VisitanteDto>());
            }

            Guid condominoUnidadePrincipal = userUnidadeIds.First();

            if (idParaFiltrar.HasValue && idParaFiltrar.Value != condominoUnidadePrincipal)
            {
                return Forbid("Você só pode listar visitantes da sua unidade.");
            }
            idParaFiltrar = condominoUnidadePrincipal;
        }

        var visitantes = await _visitanteService.ListarVisitantesAtuaisAsync(idParaFiltrar, ct);
        return Ok(visitantes);
    }

    [HttpGet("por-status/{status}")]
    [Authorize(Roles = "Sindico,Administrador,Porteiro")]
    public async Task<ActionResult<IEnumerable<VisitanteDto>>> ListarVisitantesPorStatus(VisitanteStatus status, [FromQuery] Guid? unidadeId, CancellationToken ct)
    {
        var visitantes = await _visitanteService.ListarVisitantesPorStatusAsync(status, unidadeId, ct);
        return Ok(visitantes);
    }

    [HttpPost("pre-autorizar")]
    [Authorize(Roles = "Condomino,Administrador,Sindico")] // Sindico added as they might pre-authorize too
    public async Task<ActionResult<VisitanteDto>> PreAutorizarVisita([FromBody] PreAutorizacaoVisitanteDto preAuthDto, CancellationToken ct)
    {
        var authenticatedUserId = GetAuthenticatedUserId();
        var userRoles = User.FindAll(ClaimTypes.Role).Select(r => r.Value);

        if (userRoles.Contains("Condomino"))
        {
            if (preAuthDto.CondominoId != authenticatedUserId)
            {
                return BadRequest(new { message = "O ID do condômino na requisição não corresponde ao usuário autenticado." });
            }

            var userUnidadeIds = (await _usuarioService.GetUnidadesIdDoUsuarioAsync(authenticatedUserId, ct)).ToList();
            if (!userUnidadeIds.Any() || !userUnidadeIds.Contains(preAuthDto.UnidadeId))
            {
                return BadRequest(new { message = "A unidade especificada não pertence a este condômino ou o condômino não possui unidade associada." });
            }
        }

        try
        {
            var visitanteDto = await _visitanteService.PreAutorizarVisitaAsync(preAuthDto, ct);
            return CreatedAtAction(nameof(ObterVisitantePorId), new { id = visitanteDto.Id }, visitanteDto);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
             return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("validar-qr-code")]
    [Authorize(Roles = "Porteiro,Administrador")]
    public async Task<ActionResult<VisitanteDto>> ValidarEntradaComQRCode([FromBody] QRCodeValidationRequestDto request, CancellationToken ct)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.QRCodeValue))
        {
            return BadRequest(new { message = "QR Code não pode ser vazio." });
        }
        var porteiroId = GetAuthenticatedUserId();
        try
        {
            var visitanteDto = await _visitanteService.ValidarEntradaComQRCodeAsync(request.QRCodeValue, porteiroId, ct);
            if (visitanteDto == null)
            {
                return NotFound(new { message = "QR Code inválido, expirado ou visitante não encontrado." });
            }
            return Ok(visitanteDto);
        }
        catch (InvalidOperationException ex) // Catches specific exception for expired QR from service
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception) // Removed 'ex'
        {
            // Log ex (TODO: Add actual logging)
            return StatusCode(500, new { message = "Ocorreu um erro interno ao validar o QR Code." });
        }
    }
}
