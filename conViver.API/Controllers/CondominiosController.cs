using Microsoft.AspNetCore.Mvc;
using conViver.Core.Entities;
using conViver.Core.DTOs;
using conViver.Application;
using Microsoft.AspNetCore.Authorization;
using System; // Adicionado para Guid
using System.Collections.Generic; // Adicionado para IEnumerable
using System.Threading.Tasks; // Adicionado para Task
// using System.Security.Claims; // Adicionar se adminUserId for usado para auditoria

namespace conViver.API.Controllers;

[ApiController]
[Route("api/v1/adm/condominios")] // Rota ajustada para consistência
[Authorize(Roles = "Administradora,SuperAdmin")] // Roles ajustadas para maior clareza
public class CondominiosController : ControllerBase
{
    private readonly CondominioService _condosService; // Renomeado para _condosService

    public CondominiosController(CondominioService condosService)
    {
        _condosService = condosService;
    }

    /// <summary>
    /// Lista todos os condomínios cadastrados na plataforma.
    /// </summary>
    /// <returns>Uma lista de condomínios.</returns>
    /// <response code="200">Retorna a lista de condomínios.</response>
    /// <response code="401">Usuário não autorizado.</response>
    /// <response code="403">Usuário não tem permissão (não é Administradora/SuperAdmin).</response>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<CondominioDto>>> ListarCondominios()
    {
        // Assumindo que _condosService.ListarTodosAsync() retorna List<CondominioDto>
        var items = await _condosService.ListarTodosAsync();
        return Ok(items);
    }

    /// <summary>
    /// Obtém detalhes de um condomínio específico.
    /// </summary>
    /// <param name="id">ID do condomínio.</param>
    /// <returns>Detalhes do condomínio.</returns>
    /// <response code="200">Retorna os detalhes do condomínio.</response>
    /// <response code="401">Usuário não autorizado.</response>
    /// <response code="403">Usuário não tem permissão.</response>
    /// <response code="404">Condomínio não encontrado.</response>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CondominioDto>> ObterCondominioPorId(Guid id)
    {
        // Assumindo que _condosService.ObterPorIdDetalhadoAsync(id) retorna CondominioDto
        var condominioDto = await _condosService.ObterPorIdDetalhadoAsync(id);
        if (condominioDto == null) return NotFound("Condomínio não encontrado.");
        return Ok(condominioDto);
    }

    /// <summary>
    /// Cadastra um novo condomínio na plataforma.
    /// </summary>
    /// <param name="inputDto">Dados do condomínio a ser criado.</param>
    /// <returns>O condomínio recém-criado.</returns>
    /// <response code="201">Retorna o condomínio criado.</response>
    /// <response code="400">Dados de entrada inválidos.</response>
    /// <response code="401">Usuário não autorizado.</response>
    /// <response code="403">Usuário não tem permissão.</response>
    [HttpPost]
    public async Task<ActionResult<CondominioDto>> CriarCondominio([FromBody] CondominioInputDto inputDto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        // var adminUserId = User.FindFirstValue(ClaimTypes.NameIdentifier); // Para auditoria no serviço
        // Assumindo que _condosService.CriarAsync(inputDto, adminUserId) retorna CondominioDto
        var condominioDto = await _condosService.CriarCondominioAsync(inputDto);
        return CreatedAtAction(nameof(ObterCondominioPorId), new { id = condominioDto.Id }, condominioDto);
    }

    /// <summary>
    /// Atualiza os dados de um condomínio existente.
    /// </summary>
    /// <param name="id">ID do condomínio a ser atualizado.</param>
    /// <param name="inputDto">Dados para atualização.</param>
    /// <returns>O condomínio atualizado.</returns>
    /// <response code="200">Retorna o condomínio atualizado.</response>
    /// <response code="400">Dados de entrada inválidos.</response>
    /// <response code="401">Usuário não autorizado.</response>
    /// <response code="403">Usuário não tem permissão.</response>
    /// <response code="404">Condomínio não encontrado.</response>
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<CondominioDto>> AtualizarCondominio(Guid id, [FromBody] CondominioInputDto inputDto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        // var adminUserId = User.FindFirstValue(ClaimTypes.NameIdentifier); // Para auditoria
        // Assumindo que _condosService.AtualizarAsync(id, inputDto, adminUserId) retorna CondominioDto
        var condominioDto = await _condosService.AtualizarCondominioAsync(id, inputDto);
        if (condominioDto == null) return NotFound("Condomínio não encontrado.");

        return Ok(condominioDto);
    }

    /// <summary>
    /// Remove um condomínio da plataforma.
    /// </summary>
    /// <remarks>ATENÇÃO: Esta é uma operação destrutiva e deve ser usada com cautela.</remarks>
    /// <param name="id">ID do condomínio a ser removido.</param>
    /// <response code="204">Condomínio removido com sucesso.</response>
    /// <response code="401">Usuário não autorizado.</response>
    /// <response code="403">Usuário não tem permissão.</response>
    /// <response code="404">Condomínio não encontrado.</response>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeletarCondominio(Guid id)
    {
        // var adminUserId = User.FindFirstValue(ClaimTypes.NameIdentifier); // Para auditoria
        // Assumindo que _condosService.DeletarAsync(id, adminUserId) retorna bool
        var sucesso = await _condosService.DeletarCondominioAsync(id);
        if (!sucesso) return NotFound("Condomínio não encontrado ou não pôde ser removido.");

        return NoContent();
    }
}
