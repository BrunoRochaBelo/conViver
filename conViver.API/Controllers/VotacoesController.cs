using conViver.Application; // Assuming VotacaoService is in conViver.Application
using conViver.Core.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;

namespace conViver.API.Controllers;

[ApiController]
[Route("/api/v1/[controller]")] // Using controller name as base route
[Authorize]
public class VotacoesController : ControllerBase
{
    private readonly VotacaoService _votacaoService;

    public VotacoesController(VotacaoService votacaoService)
    {
        _votacaoService = votacaoService;
    }

    /// <summary>
    /// Cria uma nova votação para o condomínio.
    /// </summary>
    /// <param name="votacaoInput">Dados da votação a ser criada.</param>
    /// <returns>Os detalhes da votação recém-criada.</returns>
    /// <response code="201">Retorna a votação criada.</response>
    /// <response code="400">Se os dados da votação forem inválidos.</response>
    /// <response code="401">Usuário não autorizado ou claims não encontradas.</response>
    /// <response code="403">Usuário não tem permissão (não é Síndico).</response>
    [HttpPost("syndic/votacoes")]
    [Authorize(Roles = "Sindico")]
    public async Task<ActionResult<VotacaoDetalheDto>> CriarVotacao([FromBody] VotacaoInputDto votacaoInput)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var condominioIdClaim = User.FindFirstValue("condominioId");

        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid userId) ||
            string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("Informações de usuário ou condomínio inválidas no token.");
        }

        // O VotacaoService.CriarAsync retorna a entidade Votacao.
        // Precisamos mapeá-la para VotacaoDetalheDto para o retorno, ou ajustar o serviço.
        // Por ora, vamos assumir que o serviço retorna a entidade e fazemos o mapeamento aqui
        // ou (melhor) o ObterDetalhesAsync é chamado.
        var novaVotacaoEntidade = await _votacaoService.CriarAsync(condominioId, votacaoInput, userId);

        // Para popular o VotacaoDetalheDto completamente, especialmente UsuarioJaVotou e QuantidadeVotos,
        // é melhor chamar ObterDetalhesAsync.
        var dtoDeRetorno = await _votacaoService.ObterDetalhesAsync(novaVotacaoEntidade.Id, condominioId, userId);
        if (dtoDeRetorno == null)
        {
            // Isso seria inesperado se a criação funcionou, mas é uma salvaguarda.
            return Problem("Não foi possível obter os detalhes da votação recém-criada.");
        }

        return CreatedAtAction(nameof(ObterVotacaoPorId), new { id = novaVotacaoEntidade.Id }, dtoDeRetorno);
    }

    /// <summary>
    /// Lista as votações abertas para o condomínio do usuário.
    /// </summary>
    /// <returns>Uma lista de votações abertas.</returns>
    /// <response code="200">Retorna a lista de votações.</response>
    /// <response code="401">Usuário não autorizado ou CondominioId não encontrado.</response>
    [HttpGet("app/votacoes")]
    [Authorize(Roles = "Sindico,Condomino,Inquilino")] // Ajustar roles conforme necessário
    public async Task<ActionResult<IEnumerable<VotacaoResumoDto>>> ListarVotacoesAbertas()
    {
        var condominioIdClaim = User.FindFirstValue("condominioId");
        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("CondominioId não encontrado ou inválido no token.");
        }

        var votacoes = await _votacaoService.ListarAbertasAsync(condominioId);
        return Ok(votacoes);
    }

    /// <summary>
    /// Obtém os detalhes de uma votação específica.
    /// </summary>
    /// <param name="id">ID da votação.</param>
    /// <returns>Os detalhes da votação.</returns>
    /// <response code="200">Retorna os detalhes da votação.</response>
    /// <response code="401">Usuário não autorizado ou claims não encontradas.</response>
    /// <response code="404">Votação não encontrada.</response>
    [HttpGet("app/votacoes/{id:guid}")]
    [Authorize(Roles = "Sindico,Condomino,Inquilino")] // Ajustar roles
    public async Task<ActionResult<VotacaoDetalheDto>> ObterVotacaoPorId(Guid id)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var condominioIdClaim = User.FindFirstValue("condominioId");

        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid userId) ||
            string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("Informações de usuário ou condomínio inválidas no token.");
        }

        var votacaoDetalhe = await _votacaoService.ObterDetalhesAsync(id, condominioId, userId);

        if (votacaoDetalhe == null)
        {
            return NotFound();
        }

        return Ok(votacaoDetalhe);
    }

    /// <summary>
    /// Registra um voto em uma opção de uma votação específica.
    /// </summary>
    /// <param name="id">ID da votação.</param>
    /// <param name="votoInput">ID da opção escolhida.</param>
    /// <returns>Status code indicando o resultado da operação.</returns>
    /// <response code="200">Voto registrado com sucesso.</response>
    /// <response code="400">Requisição inválida (ex: votação não aberta, opção inválida).</response>
    /// <response code="401">Usuário não autorizado ou claims não encontradas.</response>
    /// <response code="404">Votação não encontrada.</response>
    /// <response code="409">Usuário já votou nesta votação.</response>
    [HttpPost("app/votacoes/{id:guid}/votar")]
    [Authorize(Roles = "Sindico,Condomino,Inquilino")] // Ajustar roles
    public async Task<IActionResult> RegistrarVoto(Guid id, [FromBody] VotoInputDto votoInput)
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
            var sucesso = await _votacaoService.RegistrarVotoAsync(id, votoInput.OpcaoId, condominioId, userId, votoInput.UnidadeId, HttpContext.Connection.RemoteIpAddress?.ToString(), votoInput.DeviceId);
            if (sucesso)
            {
                return Ok("Voto registrado com sucesso.");
            }
            else
            {
                // Se RegistrarVotoAsync retornar false em vez de lançar exceção para casos como "não encontrado"
                return NotFound("Votação ou opção não encontrada.");
            }
        }
        catch (InvalidOperationException ex)
        {
            // Captura exceções de regra de negócio como "já votou" ou "votação fechada"
            if (ex.Message.Contains("Usuário já votou"))
            {
                return Conflict(ex.Message);
            }
            return BadRequest(ex.Message);
        }
        // Outras exceções não tratadas resultarão em 500 Internal Server Error, o que é apropriado.
    }

    /// <summary>
    /// Obtém os resultados de uma votação (visão do síndico).
    /// </summary>
    /// <param name="id">ID da votação.</param>
    /// <returns>Os detalhes e resultados da votação.</returns>
    /// <response code="200">Retorna os resultados da votação.</response>
    /// <response code="401">Usuário não autorizado ou claims não encontradas.</response>
    /// <response code="403">Usuário não tem permissão (não é Síndico).</response>
    /// <response code="404">Votação não encontrada.</response>
    [HttpGet("syndic/votacoes/{id:guid}/resultado")]
    [Authorize(Roles = "Sindico")]
    public async Task<ActionResult<VotacaoDetalheDto>> ObterResultadoVotacao(Guid id)
    {
        var condominioIdClaim = User.FindFirstValue("condominioId");
        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("CondominioId não encontrado ou inválido no token.");
        }

        var resultadoDto = await _votacaoService.ObterResultadoComoSindicoAsync(id, condominioId);

        if (resultadoDto == null)
        {
            return NotFound("Votação não encontrada.");
        }

        return Ok(resultadoDto);
    }

    /// <summary>
    /// Encerra uma votação que está em andamento.
    /// </summary>
    /// <param name="id">ID da votação a ser encerrada.</param>
    /// <returns>Status code indicando o resultado da operação.</returns>
    /// <response code="200">Votação encerrada com sucesso.</response>
    /// <response code="204">Votação encerrada com sucesso (alternativa).</response>
    /// <response code="401">Usuário não autorizado ou claims não encontradas.</response>
    /// <response code="403">Usuário não tem permissão (não é Síndico).</response>
    /// <response code="404">Votação não encontrada.</response>
    [HttpPut("syndic/votacoes/{id:guid}/encerrar")]
    [Authorize(Roles = "Sindico")]
    public async Task<IActionResult> EncerrarVotacao(Guid id)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier); // Necessário para auditoria ou regras de negócio no serviço
        var condominioIdClaim = User.FindFirstValue("condominioId");

        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid userId) ||
            string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("Informações de usuário ou condomínio inválidas no token.");
        }

        var sucesso = await _votacaoService.EncerrarVotacaoAsync(id, condominioId, userId);

        if (!sucesso)
        {
            return NotFound("Votação não encontrada ou já encerrada de forma imutável.");
        }

        return Ok("Votação encerrada com sucesso."); // Ou NoContent()
    }
}
