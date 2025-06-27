using Microsoft.AspNetCore.Mvc;
using conViver.Core.Entities;
using conViver.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using conViver.Core.DTOs; // Added for DTOs
using System.Collections.Generic; // Added for IEnumerable
using System.Threading.Tasks; // Added for Task
using System; // Added for Guid
using System.Security.Claims; // Added for ClaimTypes
using System.ComponentModel.DataAnnotations; // Para [Required]

namespace conViver.API.Controllers;

[ApiController]
[Route("api/v1/financeiro")] // Changed route
[Authorize(Roles = "Sindico")]
public class FinanceiroController : ControllerBase
{
    private readonly IFinanceiroService _financeiro;

    public FinanceiroController(IFinanceiroService financeiro)
    {
        _financeiro = financeiro;
    }

    // --- Endpoints de Cobranças (Boletos) ---

    /// <summary>
    /// Obtém dados para o dashboard de cobranças do condomínio.
    /// </summary>
    /// <returns>Dados do dashboard de cobranças.</returns>
    /// <response code="200">Retorna os dados do dashboard.</response>
    /// <response code="401">Usuário não autorizado ou CondominioId inválido.</response>
    /// <response code="404">Dados não encontrados.</response>
    [HttpGet("cobrancas/dashboard")]
    public async Task<ActionResult<DashboardFinanceiroCobrancasDto>> GetDashboardCobrancas()
    {
        var condominioIdClaim = User.FindFirstValue("condominioId");
        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("CondominioId não encontrado ou inválido no token.");
        }
        var dashboardData = await _financeiro.GetDashboardCobrancasAsync(condominioId);
        if (dashboardData == null)
        {
            return NotFound("Dados do dashboard financeiro não encontrados.");
        }
        return Ok(dashboardData);
    }

    /// <summary>
    /// Lista as cobranças do condomínio.
    /// </summary>
    /// <param name="status">Filtra as cobranças por status (opcional).</param>
    /// <returns>Uma lista de cobranças.</returns>
    /// <response code="200">Retorna a lista de cobranças.</response>
    /// <response code="401">Usuário não autorizado ou CondominioId inválido.</response>
    [HttpGet("cobrancas")]
    public async Task<ActionResult<IEnumerable<CobrancaDto>>> GetCobrancas([FromQuery] string? status)
    {
        var condominioIdClaim = User.FindFirstValue("condominioId");
        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("CondominioId não encontrado ou inválido no token.");
        }
        var itens = await _financeiro.ListarCobrancasAsync(condominioId, status);
        return Ok(itens);
    }

    /// <summary>
    /// Obtém detalhes de uma cobrança específica.
    /// </summary>
    /// <param name="id">ID da cobrança.</param>
    /// <returns>Detalhes da cobrança.</returns>
    /// <response code="200">Retorna os detalhes da cobrança.</response>
    /// <response code="401">Usuário não autorizado.</response>
    /// <response code="404">Cobrança não encontrada.</response>
    [HttpGet("cobrancas/{id:guid}")] // Adicionado :guid para clareza
    public async Task<ActionResult<CobrancaDto>> GetCobranca(Guid id)
    {
        // Validação de acesso à cobrança específica (pertence ao condomínio do usuário)
        // deveria ser feita no serviço _financeiro.GetCobrancaByIdAsync(id, condominioId)
        var cobranca = await _financeiro.GetCobrancaByIdAsync(id);
        if (cobranca == null) return NotFound("Cobrança não encontrada.");
        return Ok(cobranca);
    }

    /// <summary>
    /// Cria uma nova cobrança para uma unidade ou grupo de unidades.
    /// </summary>
    /// <param name="request">Dados da nova cobrança.</param>
    /// <returns>A cobrança criada.</returns>
    /// <response code="201">Retorna a cobrança criada.</response>
    /// <response code="400">Dados de entrada inválidos ou falha na operação.</response>
    /// <response code="401">Usuário não autorizado ou claims inválidas.</response>
    [HttpPost("cobrancas")]
    public async Task<ActionResult<CobrancaDto>> CreateCobranca([FromBody] NovaCobrancaDto request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }
        try
        {
            var condominioIdClaim = User.FindFirstValue("condominioId");
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier); // Assumindo que o criador é o usuário logado

            if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId) ||
                string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid userId))
            {
                return Unauthorized("CondominioId ou UserId não encontrado ou inválido no token.");
            }
            // Ajustar _financeiro.CriarCobrancaAsync para aceitar userId se necessário, ou remover se não for usado.
            var cobranca = await _financeiro.CriarCobrancaAsync(condominioId, request);
            return CreatedAtAction(nameof(GetCobranca), new { id = cobranca.Id }, cobranca);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = "INVALID_OPERATION", message = ex.Message });
        }
        catch (Exception)
        {
            // Log exception
            return StatusCode(500, "Ocorreu um erro interno ao criar a cobrança.");
        }
    }

    [HttpPost("cobrancas/gerar-lote")]
    public async Task<ActionResult<ResultadoOperacaoDto>> GerarCobrancasEmLote([FromBody] GeracaoLoteRequestDto request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }
        var condominioIdClaim = User.FindFirstValue("condominioId");
        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("CondominioId não encontrado ou inválido no token.");
        }
        var resultado = await _financeiro.GerarCobrancasEmLoteAsync(condominioId, request);
        if (!resultado.Sucesso)
        {
            return BadRequest(resultado);
        }
        return Ok(resultado);
    }

    /// <summary>
    /// Obtém o link para a segunda via de um boleto/cobrança.
    /// </summary>
    /// <param name="id">ID da cobrança.</param>
    /// <returns>URL para a segunda via.</returns>
    /// <response code="200">Retorna a URL.</response>
    /// <response code="404">Link não encontrado ou cobrança não permite segunda via.</response>
    /// <response code="500">Erro interno.</response>
    [HttpGet("cobrancas/{id:guid}/segunda-via")]
    public async Task<ActionResult<object>> GetSegundaVia(Guid id) // Retornando object para { url: link }
    {
        try
        {
            // Adicionar verificação de condominioId se o serviço precisar
            var link = await _financeiro.ObterLinkSegundaViaAsync(id);
            if (string.IsNullOrEmpty(link))
            {
                return NotFound("Link para segunda via não encontrado ou não aplicável.");
            }
            // Pode ser um JSON com o link ou um redirecionamento, dependendo da implementação.
            // Por simplicidade, retornando o link como string.
            return Ok(new { url = link });
        }
        catch (Exception)
        {
            // Log exception
            return StatusCode(500, "Erro ao obter link da segunda via.");
        }
    }

    [HttpPut("cobrancas/{id}/cancelar")] // Route updated
    public async Task<ActionResult> CancelarCobranca(Guid id) // Method name updated
    {
        // Adicionar extração de condominioId se o CancelarCobrancaAsync precisar dele para validação de escopo.
        // var condominioIdClaim = User.FindFirstValue("condominioId");
        // if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        // {
        //     return Unauthorized("CondominioId não encontrado ou inválido no token.");
        // }
        // var resultado = await _financeiro.CancelarCobrancaAsync(id, condominioId); // Exemplo se precisar de condominioId

        try
        {
            var resultado = await _financeiro.CancelarCobrancaAsync(id); // Mantendo como está se o serviço não precisa de condominioId
            if (!resultado.Sucesso)
            {
                return BadRequest(resultado); // Ou Conflict se for o caso
            }
            return Ok(resultado); // Idealmente NoContent() para PUT sem retorno de corpo, ou Ok(resultadoDto)
        }
        catch (InvalidOperationException ex) // Específico para regras de negócio como "boleto pago"
        {
            return Conflict(new { error = "INVALID_OPERATION", message = ex.Message });
        }
        catch (Exception)
        {
             // Log exception
            return StatusCode(500, "Erro ao cancelar a cobrança.");
        }
    }

    // --- Endpoints de Despesas ---

    /// <summary>
    /// Registra uma nova despesa para o condomínio.
    /// </summary>
    /// <param name="despesaInput">Dados da despesa.</param>
    /// <returns>A despesa registrada.</returns>
    /// <response code="201">Retorna a despesa criada.</response>
    /// <response code="400">Dados de entrada inválidos.</response>
    /// <response code="401">Usuário não autorizado ou claims inválidas.</response>
    [HttpPost("despesas")]
    public async Task<ActionResult<DespesaDto>> RegistrarDespesa([FromBody] DespesaInputDto despesaInput)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var condominioIdClaim = User.FindFirstValue("condominioId");
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId) ||
            string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid usuarioId))
        {
            return Unauthorized("CondominioId ou UserId não encontrado ou inválido no token.");
        }

        // Assumindo que o serviço FinanceiroService terá um método CriarDespesaAsync
        // e que a Despesa é um tipo de LancamentoFinanceiro.
        var novaDespesa = await _financeiro.CriarDespesaAsync(condominioId, usuarioId, despesaInput);
        // O serviço deve retornar um DespesaDto ou a entidade para ser mapeada aqui.
        // Por simplicidade, assumindo que o serviço retorna DespesaDto.

        return CreatedAtAction(nameof(GetDespesa), new { id = novaDespesa.Id }, novaDespesa);
    }

    /// <summary>
    /// Lista as despesas do condomínio.
    /// </summary>
    /// <param name="categoria">Filtra por categoria (opcional).</param>
    /// <param name="mesCompetencia">Filtra por mês de competência (YYYY-MM) (opcional).</param>
    /// <returns>Lista de despesas.</returns>
    /// <response code="200">Retorna a lista de despesas.</response>
    /// <response code="401">Usuário não autorizado ou CondominioId inválido.</response>
    [HttpGet("despesas")]
    public async Task<ActionResult<IEnumerable<DespesaDto>>> ListarDespesas([FromQuery] string? categoria, [FromQuery] string? mesCompetencia)
    {
        var condominioIdClaim = User.FindFirstValue("condominioId");
        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("CondominioId não encontrado ou inválido no token.");
        }
        // Parse mesCompetencia para DateTime se necessário no serviço
        var despesas = await _financeiro.ListarDespesasAsync(condominioId, categoria, mesCompetencia);
        return Ok(despesas);
    }

    /// <summary>
    /// Obtém detalhes de uma despesa específica.
    /// </summary>
    /// <param name="id">ID da despesa (LancamentoFinanceiro).</param>
    /// <returns>Detalhes da despesa.</returns>
    /// <response code="200">Retorna os detalhes da despesa.</response>
    /// <response code="401">Usuário não autorizado.</response>
    /// <response code="404">Despesa não encontrada.</response>
    [HttpGet("despesas/{id:guid}")]
    public async Task<ActionResult<DespesaDto>> GetDespesa(Guid id)
    {
        var condominioIdClaim = User.FindFirstValue("condominioId");
        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("CondominioId não encontrado ou inválido no token.");
        }
        // O serviço deve validar se a despesa 'id' pertence ao 'condominioId'
        var despesa = await _financeiro.ObterDespesaPorIdAsync(id, condominioId);
        if (despesa == null) return NotFound("Despesa não encontrada.");
        return Ok(despesa);
    }

    /// <summary>
    /// Atualiza uma despesa existente.
    /// </summary>
    /// <param name="id">ID da despesa a ser atualizada.</param>
    /// <param name="despesaInput">Dados para atualização.</param>
    /// <returns>A despesa atualizada.</returns>
    /// <response code="200">Retorna a despesa atualizada.</response>
    /// <response code="400">Dados de entrada inválidos.</response>
    /// <response code="401">Usuário não autorizado.</response>
    /// <response code="404">Despesa não encontrada.</response>
    [HttpPut("despesas/{id:guid}")]
    public async Task<ActionResult<DespesaDto>> UpdateDespesa(Guid id, [FromBody] DespesaInputDto despesaInput)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var condominioIdClaim = User.FindFirstValue("condominioId");
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier); // Para auditoria de quem atualizou

        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId) ||
            string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid usuarioId))
        {
            return Unauthorized("CondominioId ou UserId não encontrado ou inválido no token.");
        }

        var despesaAtualizada = await _financeiro.AtualizarDespesaAsync(id, condominioId, usuarioId, despesaInput);
        if (despesaAtualizada == null) return NotFound("Despesa não encontrada ou não pôde ser atualizada.");

        return Ok(despesaAtualizada);
    }

    /// <summary>
    /// Remove (ou cancela) uma despesa.
    /// </summary>
    /// <param name="id">ID da despesa a ser removida/cancelada.</param>
    /// <returns>Nenhum conteúdo.</returns>
    /// <response code="204">Despesa removida/cancelada com sucesso.</response>
    /// <response code="401">Usuário não autorizado.</response>
    /// <response code="404">Despesa não encontrada.</response>
    [HttpDelete("despesas/{id:guid}")]
    public async Task<IActionResult> DeleteDespesa(Guid id)
    {
        var condominioIdClaim = User.FindFirstValue("condominioId");
         var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier); // Para auditoria

        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId) ||
            string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid usuarioId))
        {
            return Unauthorized("CondominioId ou UserId não encontrado ou inválido no token.");
        }

        var sucesso = await _financeiro.RemoverDespesaAsync(id, condominioId, usuarioId);
        if (!sucesso) return NotFound("Despesa não encontrada ou não pôde ser removida.");

        return NoContent();
    }

    // --- Endpoints de Relatórios ---

    /// <summary>
    /// Gera o relatório de balancete para um período.
    /// </summary>
    /// <param name="dataInicio">Data de início do período (YYYY-MM-DD).</param>
    /// <param name="dataFim">Data de fim do período (YYYY-MM-DD).</param>
    /// <returns>O relatório de balancete.</returns>
    /// <response code="200">Retorna o balancete.</response>
    /// <response code="400">Datas inválidas.</response>
    /// <response code="401">Usuário não autorizado.</response>
    [HttpGet("relatorios/balancete")]
    public async Task<ActionResult<BalanceteDto>> GetBalancete([FromQuery, Required] DateTime dataInicio, [FromQuery, Required] DateTime dataFim)
    {
        if (dataInicio > dataFim) return BadRequest("Data de início não pode ser maior que a data de fim.");

        var condominioIdClaim = User.FindFirstValue("condominioId");
        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("CondominioId não encontrado ou inválido no token.");
        }

        var balancete = await _financeiro.GerarBalanceteAsync(condominioId, dataInicio, dataFim);
        if (balancete == null) return NotFound("Não foi possível gerar o balancete para o período.");

        return Ok(balancete);
    }

    /// <summary>
    /// (Administradora) Gera cobranças em lote para um condomínio.
    /// </summary>
    [HttpPost("/api/v1/adm/finance/batch")]
    [Authorize(Roles = "Administradora")]
    public async Task<ActionResult<ResultadoOperacaoDto>> AdminFinanceBatch([FromBody] GeracaoLoteRequestDto request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var resultado = await _financeiro.GerarCobrancasEmLoteAsync(Guid.Empty, request); // condomínio informado no DTO
        return Ok(resultado);
    }

    /// <summary>
    /// (Síndico) Obtém detalhes de um boleto específico, possivelmente em formato PDF. (API Ref 4.4)
    /// </summary>
    [HttpGet("boletos/{id:guid}/pdf")]
    public async Task<ActionResult<BoletoPdfDto>> GetBoletoPdf(Guid id)
    {
        var doc = await _financeiro.ObterBoletoPdfAsync(id);
        if (doc == null) return NotFound();
        return Ok(doc);
    }

    /// <summary>
    /// (Síndico) Reenvia um boleto (2ª via) por e-mail. (API Ref 4.6)
    /// </summary>
    [HttpPost("boletos/{id:guid}/resend")]
    public async Task<IActionResult> ResendBoleto(Guid id)
    {
        await _financeiro.ReenviarBoletoAsync(id);
        return Accepted();
    }

    /// <summary>
    /// (Público/Webhook) Callback para notificação de pagamento bancário. (API Ref 5.1)
    /// </summary>
    [HttpPost("/api/v1/finance/callback")]
    [AllowAnonymous]
    public async Task<IActionResult> FinanceCallback([FromBody] PagamentoWebhookDto dto)
    {
        await _financeiro.ProcessarWebhookAsync(dto);
        return Ok();
    }

    /// <summary>
    /// (Síndico) Registra um pagamento manualmente. (API Ref 5.2)
    /// </summary>
    [HttpPost("manual-payment")]
    public async Task<ActionResult<PagamentoDto>> ManualPayment([FromBody] ManualPaymentInputDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var result = await _financeiro.RegistrarPagamentoManualAsync(dto.BoletoId, dto.Valor, dto.DataPagamento);
        if (result == null) return NotFound();
        return CreatedAtAction(nameof(GetCobranca), new { id = dto.BoletoId }, result);
    }

    [HttpPost("orcamentos/{ano}")]
    public async Task<ActionResult<IEnumerable<OrcamentoAnualDto>>> RegistrarOrcamento(int ano, [FromBody] List<OrcamentoCategoriaInputDto> categorias)
    {
        var condominioIdClaim = User.FindFirstValue("condominioId");
        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("CondominioId não encontrado ou inválido no token.");
        }
        var resultado = await _financeiro.RegistrarOrcamentoAsync(condominioId, ano, categorias);
        return Ok(resultado);
    }

    [HttpGet("orcamentos/{ano}")]
    public async Task<ActionResult<IEnumerable<OrcamentoAnualDto>>> ObterOrcamento(int ano)
    {
        var condominioIdClaim = User.FindFirstValue("condominioId");
        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("CondominioId não encontrado ou inválido no token.");
        }
        var itens = await _financeiro.ObterOrcamentoAsync(condominioId, ano);
        return Ok(itens);
    }

    [HttpGet("orcamentos/{ano}/comparativo")]
    public async Task<ActionResult<IEnumerable<OrcamentoComparativoDto>>> CompararOrcamento(int ano)
    {
        var condominioIdClaim = User.FindFirstValue("condominioId");
        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("CondominioId não encontrado ou inválido no token.");
        }
        var itens = await _financeiro.CompararExecucaoOrcamentoAsync(condominioId, ano);
        return Ok(itens);
    }

    /// <summary>
    /// (Administradora) Solicita um estorno de pagamento. (API Ref 5.3)
    /// </summary>
    [HttpPost("/api/v1/adm/finance/refund")]
    [Authorize(Roles = "Administradora")]
    public async Task<IActionResult> AdminFinanceRefund([FromBody] RefundRequestDto dto)
    {
        var ok = await _financeiro.SolicitarEstornoAsync(dto.PagamentoId, dto.Motivo);
        if (!ok) return NotFound();
        return Accepted();
    }

    /// <summary>
    /// (Síndico) Cria um novo plano de parcelamento (acordo) para débitos. (API Ref 5.4)
    /// </summary>
    [HttpPost("installment-plan")]
    public async Task<ActionResult<InstallmentPlanDto>> CreateInstallmentPlan([FromBody] InstallmentPlanInputDto dto)
    {
        var acordo = await _financeiro.CriarAcordoAsync(dto.UnidadeId, dto.Entrada, dto.Parcelas);
        return CreatedAtAction(nameof(GetInstallmentPlan), new { id = acordo.Id }, acordo);
    }

    /// <summary>
    /// (Síndico) Obtém detalhes de um plano de parcelamento (acordo). (API Ref 5.5)
    /// </summary>
    [HttpGet("installment-plan/{id:guid}")]
    public async Task<ActionResult<InstallmentPlanDto>> GetInstallmentPlan(Guid id)
    {
        var acordo = await _financeiro.ObterAcordoPorIdAsync(id);
        if (acordo == null) return NotFound();
        return Ok(acordo);
    }

}

