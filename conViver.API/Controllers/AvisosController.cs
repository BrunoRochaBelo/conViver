using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using conViver.Application;
using conViver.Core.Entities;
using conViver.Core.DTOs;
using System.Collections.Generic;
using System.Security.Claims;
using System;
using System.Threading.Tasks;
using conViver.Core.Interfaces; // Adicionado para INotificacaoService

namespace conViver.API.Controllers;

[ApiController]
[Route("[controller]")] // Alterado para usar o nome do controller
[Authorize]
public class AvisosController : ControllerBase
{
    private readonly AvisoService _avisos;
    private readonly INotificacaoService _notificacaoService; // Adicionado

    public AvisosController(AvisoService avisos, INotificacaoService notificacaoService) // Adicionado
    {
        _avisos = avisos;
        _notificacaoService = notificacaoService; // Adicionado
    }

    /// <summary>
    /// Lista os avisos do condomínio do usuário logado.
    /// </summary>
    /// <param name="page">Número da página.</param>
    /// <param name="size">Quantidade de itens por página.</param>
    /// <returns>Uma lista paginada de avisos.</returns>
    /// <response code="200">Retorna a lista de avisos.</response>
    /// <response code="401">Usuário não autorizado ou CondominioId não encontrado no token.</response>
    [HttpGet("/api/v1/app/avisos")] // Rota atualizada
    [Authorize(Roles = "Sindico,Condomino,Inquilino")] // Roles atualizadas (verificar nomes corretos)
    public async Task<ActionResult<IEnumerable<Aviso>>> ListarAvisosPorApp([FromQuery] int page = 1, [FromQuery] int size = 10)
    {
        var condominioIdClaim = User.FindFirstValue("condominioId");
        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("CondominioId não encontrado ou inválido no token.");
        }

        var items = await _avisos.ListarAsync(condominioId);
        var paged = items.Skip((page - 1) * size).Take(size);
        return Ok(paged);
    }

    /// <summary>
    /// Cria um novo aviso para o condomínio.
    /// </summary>
    /// <param name="avisoDto">Dados do aviso a ser criado.</param>
    /// <returns>O aviso recém-criado.</returns>
    /// <response code="201">Retorna o aviso criado.</response>
    /// <response code="400">Se os dados do aviso forem inválidos.</response>
    /// <response code="401">Usuário não autorizado ou claims não encontradas.</response>
    [HttpPost("/api/v1/syndic/avisos")]
    [Authorize(Roles = "Sindico")]
    public async Task<ActionResult<Aviso>> CriarAviso([FromBody] AvisoInputDto avisoDto)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var condominioIdClaim = User.FindFirstValue("condominioId");

        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid userId) ||
            string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("Informações de usuário ou condomínio inválidas no token.");
        }

        var novoAviso = await _avisos.PublicarAsync(condominioId, avisoDto.Categoria, avisoDto.Titulo, avisoDto.Corpo, userId);

        // Enviar notificação (simples)
        // O "destino" aqui precisaria ser resolvido para os usuários do condomínio.
        // Poderia ser um tópico como "condominio_{condominioId}_avisos"
        // ou buscar todos os usuários e enviar individualmente (menos performático para muitos usuários).
        // Para este exemplo, vamos simular um destino genérico.
        var mensagemNotificacao = $"Novo aviso publicado: '{novoAviso.Titulo}' na categoria '{novoAviso.Categoria}'.";
        await _notificacaoService.SendAsync($"condominio:{condominioId}", mensagemNotificacao);


        // Assumindo que ListarAvisosPorApp é o endpoint GET para listar todos,
        // mas o ideal seria um GetAvisoPorId se existisse.
        return CreatedAtAction(nameof(ListarAvisosPorApp), new { /* id = novoAviso.Id */ }, novoAviso);
    }

    /// <summary>
    /// Edita um aviso existente.
    /// </summary>
    /// <param name="id">ID do aviso a ser editado.</param>
    /// <param name="avisoDto">Dados atualizados do aviso.</param>
    /// <returns>O aviso atualizado.</returns>
    /// <response code="200">Retorna o aviso atualizado.</response>
    /// <response code="400">Se os dados do aviso forem inválidos.</response>
    /// <response code="401">Usuário não autorizado ou claims não encontradas.</response>
    /// <response code="404">Aviso não encontrado.</response>
    [HttpPut("/api/v1/syndic/avisos/{id}")]
    [Authorize(Roles = "Sindico")]
    public async Task<ActionResult<Aviso>> EditarAviso(Guid id, [FromBody] AvisoInputDto avisoDto)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var condominioIdClaim = User.FindFirstValue("condominioId");

        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid userId) ||
            string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("Informações de usuário ou condomínio inválidas no token.");
        }

        var avisoEditado = await _avisos.EditarAsync(id, condominioId, avisoDto.Categoria, avisoDto.Titulo, avisoDto.Corpo, userId);

        if (avisoEditado == null)
        {
            return NotFound();
        }

        // Enviar notificação de edição
        var mensagemNotificacaoEdicao = $"Aviso '{avisoEditado.Titulo}' foi atualizado.";
        await _notificacaoService.SendAsync($"condominio:{condominioId}:aviso:{avisoEditado.Id}", mensagemNotificacaoEdicao);


        return Ok(avisoEditado);
    }

    /// <summary>
    /// Arquiva (deleta) um aviso.
    /// </summary>
    /// <param name="id">ID do aviso a ser arquivado.</param>
    /// <returns>Nenhum conteúdo.</returns>
    /// <response code="204">Aviso arquivado com sucesso.</response>
    /// <response code="401">Usuário não autorizado ou claims não encontradas.</response>
    /// <response code="404">Aviso não encontrado.</response>
    [HttpDelete("/api/v1/syndic/avisos/{id}")]
    [Authorize(Roles = "Sindico")]
    public async Task<IActionResult> ArquivarAviso(Guid id)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var condominioIdClaim = User.FindFirstValue("condominioId");

        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid userId) ||
            string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("Informações de usuário ou condomínio inválidas no token.");
        }

        var sucesso = await _avisos.ArquivarAsync(id, condominioId, userId);

        if (!sucesso)
        {
            return NotFound();
        }

        return NoContent();
    }
}
