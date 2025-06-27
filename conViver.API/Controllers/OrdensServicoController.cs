using Microsoft.AspNetCore.Mvc;
using conViver.Core.Entities; // Será substituído por DTOs
using conViver.Application;    // Assumindo OrdemServicoService
using conViver.Core.DTOs;      // Adicionado
using Microsoft.AspNetCore.Authorization;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Security.Claims;  // Adicionado

namespace conViver.API.Controllers;

[ApiController]
[Route("api/v1")] // Rota base ajustada
// [Authorize] // Autorização será por endpoint para permitir diferentes roles
public class OrdensServicoController : ControllerBase
{
    private readonly OrdemServicoService _ordensService; // Renomeado para _ordensService

    public OrdensServicoController(OrdemServicoService ordensService)
    {
        _ordensService = ordensService;
    }

    // --- Endpoints para Síndico ---

    /// <summary>
    /// (Síndico) Lista todas as Ordens de Serviço do condomínio.
    /// </summary>
    /// <param name="status">Filtra por status (opcional).</param>
    /// <param name="prioridade">Filtra por prioridade (opcional).</param>
    /// <returns>Lista de Ordens de Serviço.</returns>
    [HttpGet("syndic/os")]
    [Authorize(Roles = "Sindico")]
    public async Task<ActionResult<IEnumerable<OrdemServicoDto>>> ListarOSPorSindico([FromQuery] string? status, [FromQuery] string? prioridade)
    {
        var condominioIdClaim = User.FindFirstValue("condominioId");
        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("CondominioId não encontrado ou inválido no token.");
        }
        // Assumindo que o serviço foi atualizado
        var ordens = await _ordensService.ListarOSPorCondominioAsync(condominioId, status, prioridade);
        return Ok(ordens);
    }

    /// <summary>
    /// (Síndico) Obtém detalhes de uma Ordem de Serviço específica.
    /// </summary>
    /// <param name="id">ID da Ordem de Serviço.</param>
    /// <returns>Detalhes da Ordem de Serviço.</returns>
    [HttpGet("syndic/os/{id:guid}")]
    [Authorize(Roles = "Sindico")]
    public async Task<ActionResult<OrdemServicoDto>> GetOSPorIdSindico(Guid id)
    {
        var condominioIdClaim = User.FindFirstValue("condominioId");
        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("CondominioId não encontrado ou inválido no token.");
        }
        // Assumindo que o serviço foi atualizado
        var osDto = await _ordensService.GetOSByIdAsync(id, condominioId);
        if (osDto == null) return NotFound("Ordem de Serviço não encontrada.");
        return Ok(osDto);
    }

    /// <summary>
    /// (Síndico) Cria uma nova Ordem de Serviço.
    /// </summary>
    /// <param name="inputDto">Dados da nova Ordem de Serviço.</param>
    /// <returns>A Ordem de Serviço criada.</returns>
    [HttpPost("syndic/os")]
    [Authorize(Roles = "Sindico")]
    public async Task<ActionResult<OrdemServicoDto>> CreateOSSindico([FromBody] OrdemServicoInputSindicoDto inputDto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var condominioIdClaim = User.FindFirstValue("condominioId");
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId) ||
            string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid sindicoUserId))
        {
            return Unauthorized("CondominioId ou UserId não encontrado ou inválido no token.");
        }

        // Assumindo que o serviço foi atualizado
        var osDto = await _ordensService.CriarOSPorSindicoAsync(condominioId, sindicoUserId, inputDto);
        // Usar GetOSPorIdSindico como nome da action para o CreatedAtAction
        return CreatedAtAction(nameof(GetOSPorIdSindico), new { id = osDto.Id }, osDto);
    }

    /// <summary>
    /// (Síndico) Atualiza o status ou outros detalhes de uma Ordem de Serviço.
    /// </summary>
    /// <param name="id">ID da Ordem de Serviço.</param>
    /// <param name="updateDto">Dados para atualização (ex: novo status, observação).</param>
    /// <returns>A Ordem de Serviço atualizada.</returns>
    [HttpPut("syndic/os/{id:guid}")]
    [Authorize(Roles = "Sindico")]
    public async Task<ActionResult<OrdemServicoDto>> UpdateOSStatusSindico(Guid id, [FromBody] OrdemServicoStatusUpdateDto updateDto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var condominioIdClaim = User.FindFirstValue("condominioId");
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId) ||
            string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid sindicoUserId))
        {
            return Unauthorized("CondominioId ou UserId não encontrado ou inválido no token.");
        }

        try
        {
            await _ordensService.AtualizarOSPorSindicoAsync(id, condominioId, sindicoUserId, updateDto);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = "INVALID_OPERATION", message = ex.Message });
        }
    }

    // --- Endpoints para Condôminos/Inquilinos ("app") ---

    /// <summary>
    /// (Condômino/Inquilino) Cria uma nova Ordem de Serviço (geralmente para sua unidade ou área comum).
    /// </summary>
    /// <param name="inputDto">Dados da Ordem de Serviço.</param>
    /// <returns>A Ordem de Serviço criada.</returns>
    [HttpPost("app/os")]
    [Authorize(Roles = "Condomino,Inquilino,Sindico")] // Sindico também pode usar esta rota se quiser
    public async Task<ActionResult<OrdemServicoDto>> CreateOSUsuario([FromBody] OrdemServicoInputUserDto inputDto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var condominioIdClaim = User.FindFirstValue("condominioId");
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId) ||
            string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid usuarioId))
        {
            return Unauthorized("CondominioId ou UserId não encontrado ou inválido no token.");
        }

        // Assumindo que o serviço foi atualizado
        var osDto = await _ordensService.CriarOSPorUsuarioAsync(condominioId, usuarioId, inputDto);
        // Usar GetOSPorIdUsuario como nome da action para o CreatedAtAction
        return CreatedAtAction(nameof(GetOSPorIdUsuario), new { id = osDto.Id }, osDto);
    }

    /// <summary>
    /// (Condômino/Inquilino) Lista as Ordens de Serviço abertas pelo usuário.
    /// </summary>
    /// <param name="status">Filtra por status (opcional).</param>
    /// <returns>Lista de Ordens de Serviço do usuário.</returns>
    [HttpGet("app/os")]
    [Authorize(Roles = "Condomino,Inquilino,Sindico")]
    public async Task<ActionResult<IEnumerable<OrdemServicoDto>>> ListarOSPorUsuario([FromQuery] string? status)
    {
        var condominioIdClaim = User.FindFirstValue("condominioId");
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId) ||
            string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid usuarioId))
        {
            return Unauthorized("CondominioId ou UserId não encontrado ou inválido no token.");
        }

        var ordens = await _ordensService.ListarOSPorUsuarioAsync(condominioId, usuarioId, status);
        return Ok(ordens);
    }

    /// <summary>
    /// (Condômino/Inquilino) Obtém detalhes de uma Ordem de Serviço específica criada pelo usuário.
    /// </summary>
    /// <param name="id">ID da Ordem de Serviço.</param>
    /// <returns>Detalhes da Ordem de Serviço.</returns>
    [HttpGet("app/os/{id:guid}")]
    [Authorize(Roles = "Condomino,Inquilino,Sindico")]
    public async Task<ActionResult<OrdemServicoDto>> GetOSPorIdUsuario(Guid id)
    {
        var condominioIdClaim = User.FindFirstValue("condominioId");
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId) ||
            string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid usuarioId))
        {
            return Unauthorized("CondominioId ou UserId não encontrado ou inválido no token.");
        }

        // O serviço deve garantir que o usuário só possa ver OS que ele criou ou se for síndico.
        var osDto = await _ordensService.GetOSByIdForUserAsync(id, condominioId, usuarioId, User.IsInRole("Sindico"));
        if (osDto == null) return NotFound("Ordem de Serviço não encontrada ou acesso não permitido.");
        return Ok(osDto);
    }

    // --- Endpoints para Prestadores de Serviço ---

    /// <summary>
    /// (Prestador) Lista as Ordens de Serviço atribuídas ao prestador logado.
    /// </summary>
    /// <param name="status">Filtra por status (opcional).</param>
    /// <returns>Lista de Ordens de Serviço.</returns>
    [HttpGet("prestador/os")]
    [Authorize(Roles = "Prestador")] // Necessário criar e atribuir esta Role
    public async Task<ActionResult<IEnumerable<OrdemServicoDto>>> ListarOSPrestador([FromQuery] string? status)
    {
        var prestadorUserIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier); // ID do usuário que é o prestador
        // O condominioId pode não ser relevante aqui se o prestador atende múltiplos,
        // ou pode ser uma query param opcional se ele quiser filtrar por condomínio específico.
        // Para este exemplo, vamos assumir que o serviço lida com a lógica de quais OSs o prestador pode ver.
        if (string.IsNullOrEmpty(prestadorUserIdClaim) || !Guid.TryParse(prestadorUserIdClaim, out Guid prestadorUserId))
        {
            return Unauthorized("UserId do Prestador não encontrado ou inválido no token.");
        }

        // Assumindo que o serviço foi atualizado
        var ordens = await _ordensService.ListarOSPorPrestadorAsync(prestadorUserId, status);
        return Ok(ordens);
    }

    /// <summary>
    /// (Prestador) Atualiza o progresso de uma Ordem de Serviço.
    /// </summary>
    /// <param name="id">ID da Ordem de Serviço.</param>
    /// <param name="updateDto">Dados do progresso.</param>
    /// <returns>A Ordem de Serviço atualizada.</returns>
    [HttpPut("prestador/os/{id:guid}/atualizar")]
    [Authorize(Roles = "Prestador")]
    public async Task<ActionResult<OrdemServicoDto>> UpdateOSProgressoPrestador(Guid id, [FromBody] OrdemServicoProgressoUpdateDto updateDto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var prestadorUserIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(prestadorUserIdClaim) || !Guid.TryParse(prestadorUserIdClaim, out Guid prestadorUserId))
        {
            return Unauthorized("UserId do Prestador não encontrado ou inválido no token.");
        }

        try
        {
            // Assumindo que o serviço foi atualizado
            var osDto = await _ordensService.AtualizarOSProgressoPorPrestadorAsync(id, prestadorUserId, updateDto);
            if (osDto == null) return NotFound("Ordem de Serviço não encontrada ou não pertence a este prestador.");
            return Ok(osDto);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = "INVALID_OPERATION", message = ex.Message });
        }
    }
}

