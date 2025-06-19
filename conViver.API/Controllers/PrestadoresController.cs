using conViver.Application.Services;
using conViver.Core.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;

namespace conViver.API.Controllers;

[ApiController]
[Route("/api/v1/[controller]")] // Ou [Route("[controller]")] se /api/v1 for global
[Authorize]
public class PrestadoresController : ControllerBase
{
    private readonly PrestadorService _prestadorService;

    public PrestadoresController(PrestadorService prestadorService)
    {
        _prestadorService = prestadorService;
    }

    /// <summary>
    /// Cadastra um novo prestador de serviço para o condomínio.
    /// </summary>
    /// <param name="inputDto">Dados do prestador a ser cadastrado.</param>
    /// <returns>Os dados do prestador recém-cadastrado.</returns>
    /// <response code="201">Retorna o prestador cadastrado.</response>
    /// <response code="400">Se os dados de entrada forem inválidos.</response>
    /// <response code="401">Usuário não autorizado ou claim de condomínio não encontrada.</response>
    /// <response code="403">Usuário não tem permissão (não é Síndico).</response>
    [HttpPost("syndic/prestadores")]
    [Authorize(Roles = "Sindico")]
    public async Task<ActionResult<PrestadorDto>> CadastrarPrestador([FromBody] PrestadorInputDto inputDto)
    {
        var condominioIdClaim = User.FindFirstValue("condominioId");
        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("CondominioId não encontrado ou inválido no token.");
        }

        var novoPrestadorEntidade = await _prestadorService.CadastrarPrestadorAsync(condominioId, inputDto);

        // Para o CreatedAtAction, precisaríamos de um endpoint GetById.
        // Por simplicidade e como o PrestadorDto calculado (com rating) é útil,
        // vamos mapear e retornar diretamente.
        // Se um GetById for criado, podemos mudar para CreatedAtAction.
        // O MapToPrestadorDto no serviço lida com a coleção de Avaliacoes (que estará vazia para um novo prestador).
        var prestadorDto = PrestadorService.MapToPrestadorDto(novoPrestadorEntidade);

        return CreatedAtAction(nameof(ObterPrestadorPorId), new { id = prestadorDto.Id }, prestadorDto);
    }

    /// <summary>
    /// Lista os prestadores de serviço ativos para o condomínio.
    /// </summary>
    /// <param name="especialidade">Filtra os prestadores por especialidade (opcional).</param>
    /// <returns>Uma lista de prestadores de serviço.</returns>
    /// <response code="200">Retorna a lista de prestadores.</response>
    /// <response code="401">Usuário não autorizado ou claim de condomínio não encontrada.</response>
    [HttpGet("app/prestadores")]
    [Authorize(Roles = "Sindico,Condomino,Inquilino")]
    public async Task<ActionResult<IEnumerable<PrestadorDto>>> ListarPrestadores([FromQuery] string? especialidade)
    {
        var condominioIdClaim = User.FindFirstValue("condominioId");
        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("CondominioId não encontrado ou inválido no token.");
        }

        var prestadores = await _prestadorService.ListarPrestadoresAsync(condominioId, especialidade);
        return Ok(prestadores);
    }

    // Placeholder para um futuro endpoint GetById, se necessário para CreatedAtAction.
    // [HttpGet("{id:guid}", Name = "GetPrestadorPorId")]
    // public async Task<ActionResult<PrestadorDto>> GetPrestadorPorId(Guid id)
    // {
    //     // Lógica para buscar por ID e retornar...
    //     return NotFound(); // Exemplo
    // }

    /// <summary>
    /// Obtém os detalhes de um prestador de serviço específico.
    /// </summary>
    /// <param name="id">ID do prestador de serviço.</param>
    /// <returns>Os detalhes do prestador de serviço.</returns>
    /// <response code="200">Retorna o prestador de serviço.</response>
    /// <response code="401">Usuário não autorizado ou claim de condomínio não encontrada.</response>
    /// <response code="404">Prestador de serviço não encontrado ou inativo.</response>
    [HttpGet("app/prestadores/{id:guid}")] // Rota pode ser "app" ou "syndic" dependendo da política de acesso geral
    [Authorize(Roles = "Sindico,Condomino,Inquilino")]
    public async Task<ActionResult<PrestadorDto>> ObterPrestadorPorId(Guid id)
    {
        var condominioIdClaim = User.FindFirstValue("condominioId");
        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("CondominioId não encontrado ou inválido no token.");
        }

        var prestadorDto = await _prestadorService.ObterPrestadorPorIdAsync(id, condominioId);
        if (prestadorDto == null)
        {
            return NotFound("Prestador de serviço não encontrado ou inativo.");
        }
        return Ok(prestadorDto);
    }

    /// <summary>
    /// Atualiza os dados de um prestador de serviço.
    /// </summary>
    /// <param name="id">ID do prestador a ser atualizado.</param>
    /// <param name="inputDto">Dados para atualização.</param>
    /// <returns>Os dados atualizados do prestador.</returns>
    /// <response code="200">Retorna o prestador atualizado.</response>
    /// <response code="400">Dados de entrada inválidos.</response>
    /// <response code="401">Usuário não autorizado ou claim de condomínio não encontrada.</response>
    /// <response code="403">Usuário não tem permissão (não é Síndico).</response>
    /// <response code="404">Prestador não encontrado.</response>
    [HttpPut("syndic/prestadores/{id:guid}")]
    [Authorize(Roles = "Sindico")]
    public async Task<ActionResult<PrestadorDto>> AtualizarPrestador(Guid id, [FromBody] PrestadorInputDto inputDto)
    {
        var condominioIdClaim = User.FindFirstValue("condominioId");
        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("CondominioId não encontrado ou inválido no token.");
        }

        var prestadorDto = await _prestadorService.AtualizarPrestadorAsync(id, condominioId, inputDto);
        if (prestadorDto == null)
        {
            return NotFound("Prestador de serviço não encontrado.");
        }
        return Ok(prestadorDto);
    }

    /// <summary>
    /// Desativa um prestador de serviço.
    /// </summary>
    /// <param name="id">ID do prestador a ser desativado.</param>
    /// <returns>Nenhum conteúdo se bem-sucedido.</returns>
    /// <response code="204">Prestador desativado com sucesso.</response>
    /// <response code="401">Usuário não autorizado ou claim de condomínio não encontrada.</response>
    /// <response code="403">Usuário não tem permissão (não é Síndico).</response>
    /// <response code="404">Prestador não encontrado.</response>
    [HttpDelete("syndic/prestadores/{id:guid}")]
    [Authorize(Roles = "Sindico")]
    public async Task<IActionResult> DesativarPrestador(Guid id)
    {
        var condominioIdClaim = User.FindFirstValue("condominioId");
        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("CondominioId não encontrado ou inválido no token.");
        }

        var sucesso = await _prestadorService.DesativarPrestadorAsync(id, condominioId);
        if (!sucesso)
        {
            return NotFound("Prestador de serviço não encontrado.");
        }
        return NoContent();
    }

    /// <summary>
    /// Registra uma avaliação para um prestador de serviço.
    /// </summary>
    /// <param name="id">ID do prestador de serviço a ser avaliado.</param>
    /// <param name="avaliacaoInput">Dados da avaliação.</param>
    /// <returns>A avaliação registrada.</returns>
    /// <response code="201">Retorna a avaliação criada.</response>
    /// <response code="400">Dados de entrada inválidos ou prestador não pode ser avaliado.</response>
    /// <response code="401">Usuário não autorizado ou claims não encontradas.</response>
    /// <response code="404">Prestador não encontrado ou inativo.</response>
    [HttpPost("app/prestadores/{id:guid}/avaliar")]
    [Authorize(Roles = "Sindico,Condomino,Inquilino")] // Permitir que síndico também avalie se desejado
    public async Task<ActionResult<AvaliacaoPrestadorDto>> AvaliarPrestador(Guid id, [FromBody] AvaliacaoPrestadorInputDto avaliacaoInput)
    {
        var condominioIdClaim = User.FindFirstValue("condominioId");
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId) ||
            string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid userId))
        {
            return Unauthorized("Claims de CondominioId ou UserId não encontradas ou inválidas no token.");
        }

        var avaliacaoEntidade = await _prestadorService.AvaliarPrestadorAsync(id, condominioId, userId, avaliacaoInput);
        if (avaliacaoEntidade == null)
        {
            return BadRequest("Não foi possível registrar a avaliação. Verifique se o prestador existe, está ativo e se os dados da avaliação são válidos.");
        }

        // Mapear AvaliacaoPrestador (entidade) para AvaliacaoPrestadorDto
        var avaliacaoDto = new AvaliacaoPrestadorDto
        {
            Id = avaliacaoEntidade.Id,
            UsuarioId = avaliacaoEntidade.UsuarioId,
            NomeUsuario = "", // Simplificação: NomeUsuario precisaria de lookup no UsuarioService ou join
            Nota = avaliacaoEntidade.Nota,
            Comentario = avaliacaoEntidade.Comentario,
            DataAvaliacao = avaliacaoEntidade.DataAvaliacao,
            OrdemServicoId = avaliacaoEntidade.OrdemServicoId
        };

        // Idealmente, CreatedAtAction apontaria para um endpoint GET /avaliacoes/{avaliacaoId} ou similar.
        // Por simplicidade, retornando Ok com o DTO da avaliação.
        return Ok(avaliacaoDto);
        // return CreatedAtAction("GetAvaliacaoPorId", new { prestadorId = id, avaliacaoId = avaliacaoDto.Id }, avaliacaoDto);
    }
}
