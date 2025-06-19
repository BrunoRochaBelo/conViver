using conViver.Application.Services; // Ajuste o namespace se o ChamadoService estiver em outro lugar
using conViver.Core.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;

namespace conViver.API.Controllers;

[ApiController]
[Route("/api/v1/[controller]")] // Ou [Route("[controller]")] se o /api/v1 for global
[Authorize]
public class ChamadosController : ControllerBase
{
    private readonly ChamadoService _chamadoService;

    public ChamadosController(ChamadoService chamadoService)
    {
        _chamadoService = chamadoService;
    }

    /// <summary>
    /// Abre um novo chamado no sistema.
    /// </summary>
    /// <param name="chamadoInput">Dados do chamado a ser aberto.</param>
    /// <returns>O chamado recém-criado.</returns>
    /// <response code="201">Retorna o chamado criado.</response>
    /// <response code="400">Se os dados do chamado forem inválidos.</response>
    /// <response code="401">Usuário não autorizado ou claims não encontradas.</response>
    [HttpPost("app/chamados")]
    [Authorize(Roles = "Sindico,Condomino,Inquilino")]
    public async Task<ActionResult<ChamadoDto>> AbrirChamado([FromBody] ChamadoInputDto chamadoInput)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var condominioIdClaim = User.FindFirstValue("condominioId");

        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid userId) ||
            string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("Informações de usuário ou condomínio inválidas no token.");
        }

        var novoChamadoEntidade = await _chamadoService.AbrirChamadoAsync(condominioId, userId, chamadoInput);
        var chamadoDto = ChamadoService.MapToChamadoDto(novoChamadoEntidade); // Usando o helper de mapeamento

        return CreatedAtAction(nameof(ObterChamadoPorIdApp), new { id = chamadoDto.Id }, chamadoDto);
    }

    /// <summary>
    /// Lista os chamados abertos pelo usuário logado.
    /// </summary>
    /// <param name="status">Filtra os chamados por status (opcional).</param>
    /// <returns>Uma lista dos chamados do usuário.</returns>
    /// <response code="200">Retorna a lista de chamados.</response>
    /// <response code="401">Usuário não autorizado ou claims não encontradas.</response>
    [HttpGet("app/chamados")]
    [Authorize(Roles = "Sindico,Condomino,Inquilino")]
    public async Task<ActionResult<IEnumerable<ChamadoDto>>> ListarMeusChamados([FromQuery] string? status)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var condominioIdClaim = User.FindFirstValue("condominioId");

        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid userId) ||
            string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("Informações de usuário ou condomínio inválidas no token.");
        }

        var chamados = await _chamadoService.ListarChamadosPorUsuarioAsync(condominioId, userId, status);
        return Ok(chamados);
    }

    /// <summary>
    /// Lista todos os chamados do condomínio (visão do síndico).
    /// </summary>
    /// <param name="status">Filtra os chamados por status (opcional).</param>
    /// <returns>Uma lista de todos os chamados do condomínio.</returns>
    /// <response code="200">Retorna a lista de chamados.</response>
    /// <response code="401">Usuário não autorizado ou claim de condomínio não encontrada.</response>
    /// <response code="403">Usuário não tem permissão (não é Síndico).</response>
    [HttpGet("syndic/chamados")]
    [Authorize(Roles = "Sindico")]
    public async Task<ActionResult<IEnumerable<ChamadoDto>>> ListarChamadosSindico([FromQuery] string? status)
    {
        var condominioIdClaim = User.FindFirstValue("condominioId");
        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("CondominioId não encontrado ou inválido no token.");
        }

        var chamados = await _chamadoService.ListarChamadosParaSindicoAsync(condominioId, status);
        return Ok(chamados);
    }

    /// <summary>
    /// Obtém um chamado específico pelo ID (visão do usuário do app).
    /// </summary>
    /// <param name="id">ID do chamado.</param>
    /// <returns>Os detalhes do chamado.</returns>
    /// <response code="200">Retorna o chamado.</response>
    /// <response code="401">Usuário não autorizado.</response>
    /// <response code="403">Usuário não tem permissão para ver este chamado.</response>
    /// <response code="404">Chamado não encontrado.</response>
    [HttpGet("app/chamados/{id:guid}")]
    [Authorize(Roles = "Sindico,Condomino,Inquilino")]
    public async Task<ActionResult<ChamadoDto>> ObterChamadoPorIdApp(Guid id)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var condominioIdClaim = User.FindFirstValue("condominioId");

        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid userId) ||
            string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("Informações de usuário ou condomínio inválidas no token.");
        }

        // O usuário é síndico? Poderia ser verificado com User.IsInRole("Sindico")
        // mas o service já tem o parâmetro 'isSindico'. Para simplificar, vamos assumir que
        // se ele tem acesso a este endpoint e é Sindico, ele pode ver mais.
        // No entanto, o ObterChamadoPorIdAsync já faz a lógica de quem pode ver o quê.
        // Para o condômino/inquilino, isSindico é false.
        // Para o síndico, ele pode acessar este endpoint, mas o ideal seria que ele usasse o endpoint /syndic/ para seus próprios chamados ou para ver todos.
        // Se um síndico estiver acessando ESTE endpoint para um chamado que NÃO é dele, isSindico=false garante que ele não veja se não for o criador.
        // Se o síndico criou o chamado, ele o verá.
        bool isSindico = User.IsInRole("Sindico"); // Determinando se o usuário atual é síndico.

        var chamadoDto = await _chamadoService.ObterChamadoPorIdAsync(id, condominioId, userId, isSindico);

        if (chamadoDto == null)
        {
            return NotFound("Chamado não encontrado ou acesso não permitido.");
        }

        return Ok(chamadoDto);
    }

    /// <summary>
    /// Obtém um chamado específico pelo ID (visão do síndico).
    /// </summary>
    /// <param name="id">ID do chamado.</param>
    /// <returns>Os detalhes do chamado.</returns>
    /// <response code="200">Retorna o chamado.</response>
    /// <response code="401">Usuário não autorizado ou claims não encontradas.</response>
    /// <response code="403">Usuário não tem permissão (não é Síndico).</response>
    /// <response code="404">Chamado não encontrado.</response>
    [HttpGet("syndic/chamados/{id:guid}")]
    [Authorize(Roles = "Sindico")]
    public async Task<ActionResult<ChamadoDto>> ObterChamadoPorIdSindico(Guid id)
    {
        var sindicoUserIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier); // UserId do síndico logado
        var condominioIdClaim = User.FindFirstValue("condominioId");

        if (string.IsNullOrEmpty(sindicoUserIdClaim) || !Guid.TryParse(sindicoUserIdClaim, out Guid sindicoUserId) ||
            string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("Informações de usuário ou condomínio inválidas no token.");
        }

        // Para o síndico, passamos 'isSindico = true'. O 'sindicoUserId' é o usuário logado,
        // que pode ou não ser o criador do chamado. O service usa 'isSindico' para bypassar a checagem de 'chamado.UsuarioId == usuarioId'.
        var chamadoDto = await _chamadoService.ObterChamadoPorIdAsync(id, condominioId, sindicoUserId, true);

        if (chamadoDto == null)
        {
            return NotFound("Chamado não encontrado.");
        }

        return Ok(chamadoDto);
    }

    /// <summary>
    /// Atualiza um chamado existente (realizado pelo síndico).
    /// </summary>
    /// <param name="id">ID do chamado a ser atualizado.</param>
    /// <param name="updateDto">Dados para atualização do chamado.</param>
    /// <returns>O chamado atualizado.</returns>
    /// <response code="200">Retorna o chamado atualizado.</response>
    /// <response code="400">Se os dados de atualização forem inválidos.</response>
    /// <response code="401">Usuário não autorizado ou claims não encontradas.</response>
    /// <response code="403">Usuário não tem permissão (não é Síndico).</response>
    /// <response code="404">Chamado não encontrado.</response>
    [HttpPut("syndic/chamados/{id:guid}")]
    [Authorize(Roles = "Sindico")]
    public async Task<ActionResult<ChamadoDto>> AtualizarChamado(Guid id, [FromBody] ChamadoUpdateDto updateDto)
    {
        var sindicoUserIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var condominioIdClaim = User.FindFirstValue("condominioId");

        if (string.IsNullOrEmpty(sindicoUserIdClaim) || !Guid.TryParse(sindicoUserIdClaim, out Guid sindicoUserId) ||
            string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("Informações de usuário ou condomínio inválidas no token.");
        }

        try
        {
            var chamadoDto = await _chamadoService.AtualizarChamadoAsync(id, condominioId, sindicoUserId, updateDto);
            if (chamadoDto == null)
            {
                return NotFound("Chamado não encontrado.");
            }
            return Ok(chamadoDto);
        }
        catch (InvalidOperationException ex) // Capturar possíveis exceções de regras de negócio (ex: transição de status inválida)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>
    /// Avalia um chamado concluído (realizado pelo condômino/inquilino que abriu o chamado).
    /// </summary>
    /// <param name="id">ID do chamado a ser avaliado.</param>
    /// <param name="avaliacaoDto">Dados da avaliação.</param>
    /// <returns>O chamado com a avaliação registrada.</returns>
    /// <response code="200">Retorna o chamado avaliado.</response>
    /// <response code="400">Se os dados da avaliação forem inválidos ou o chamado não puder ser avaliado.</response>
    /// <response code="401">Usuário não autorizado ou claims não encontradas.</response>
    /// <response code="403">Usuário não tem permissão para avaliar este chamado (não é o criador).</response>
    /// <response code="404">Chamado não encontrado.</response>
    [HttpPost("app/chamados/{id:guid}/avaliar")]
    [Authorize(Roles = "Condomino,Inquilino")] // Síndico não usa este endpoint para avaliar
    public async Task<ActionResult<ChamadoDto>> AvaliarChamado(Guid id, [FromBody] ChamadoAvaliacaoDto avaliacaoDto)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var condominioIdClaim = User.FindFirstValue("condominioId");

        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid userId) ||
            string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("Informações de usuário ou condomínio inválidas no token.");
        }

        try
        {
            var chamadoDto = await _chamadoService.AvaliarChamadoAsync(id, condominioId, userId, avaliacaoDto);
            if (chamadoDto == null)
            {
                // Pode ser NotFound (chamado não existe ou não pertence ao usuário)
                // ou BadRequest (não está no status correto para avaliação, ou já avaliado)
                // O serviço retorna null nesses casos, então precisamos dar uma resposta genérica ou melhorar o serviço para dar mais detalhes.
                return BadRequest("Não foi possível avaliar o chamado. Verifique se o chamado existe, pertence a você e está em status 'Concluido'.");
            }
            return Ok(chamadoDto);
        }
        catch (InvalidOperationException ex) // Caso o serviço lance exceções específicas
        {
            return BadRequest(ex.Message);
        }
    }
}
