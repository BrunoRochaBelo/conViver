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

namespace conViver.API.Controllers;

[ApiController]
[Route("api/visitantes")] // Changed route to be more generic, specific roles will protect endpoints
// [Authorize(Roles = "Sindico")] // Removed default authorization, will be per-endpoint
public class VisitantesController : ControllerBase
{
    private readonly VisitanteService _visitanteService;

    public VisitantesController(VisitanteService visitanteService)
    {
        _visitanteService = visitanteService;
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
        // TODO: Add logic for Condomino to only access their own pre-authorized or current visitors.
        // Example: if (User.IsInRole("Condomino") && visitante.UnidadeId != GetCondominoUnidadeId()) return Forbid();
        // Guid authenticatedUserId = GetAuthenticatedUserId(); // Needed for the check
        // var userRoles = User.FindAll(ClaimTypes.Role).Select(r => r.Value);
        // if (userRoles.Contains("Condomino"))
        // {
        //     // Placeholder: Assume a method to get the Condomino's UnidadeId or check against visitor's UnidadeId
        //     // This requires knowing the Condomino's UnidadeId or if the Visitante is linked to them.
        //     // For simplicity, this detailed check is deferred.
        // }
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
        // TODO: If Condomino, ensure unidadeId (if provided) is their own, or filter results to their unit.
        // Guid authenticatedUserId = GetAuthenticatedUserId();
        // var userRoles = User.FindAll(ClaimTypes.Role).Select(r => r.Value);
        // if (userRoles.Contains("Condomino"))
        // {
        //     // Placeholder: Get Condomino's UnidadeId
        //     // Guid? condominoUnidadeId = await _usuarioService.GetUnidadePrincipalDoCondominoAsync(authenticatedUserId);
        //     // if (condominoUnidadeId.HasValue) {
        //     //    if (unidadeId.HasValue && unidadeId.Value != condominoUnidadeId.Value) return Forbid();
        //     //    unidadeId = condominoUnidadeId;
        //     // } else { return Forbid(); /* Should not happen if user is Condomino */ }
        // }
        var visitantes = await _visitanteService.ListarVisitantesAtuaisAsync(unidadeId, ct);
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
                // Condomino can only pre-authorize for themselves (CondominoId in DTO must be their own ID)
                return Forbid("Condômino só pode pré-autorizar visitas para si mesmo (CondominoId no DTO deve ser o seu).");
            }
            // TODO: Validate preAuthDto.UnidadeId against the Condomino's units.
            // var userUnits = await _usuarioService.GetUnidadesDoUsuarioAsync(authenticatedUserId, ct);
            // if (!userUnits.Any(u => u.Id == preAuthDto.UnidadeId))
            //    return BadRequest(new { message = "Unidade inválida para este condômino." });
        }
        // Admin/Sindico can specify any CondominoId and UnidadeId as per DTO.

        try
        {
            var visitanteDto = await _visitanteService.PreAutorizarVisitaAsync(preAuthDto, ct);
            return CreatedAtAction(nameof(ObterVisitantePorId), new { id = visitanteDto.Id }, visitanteDto);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex) // e.g. from service layer if something is wrong
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception) // Removed 'ex'
        {
            // Log ex (TODO: Add actual logging)
            return StatusCode(500, new { message = "Ocorreu um erro interno ao pré-autorizar a visita." });
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
