using Microsoft.AspNetCore.Mvc;
using conViver.Core.Entities;
using conViver.Core.Enums;
using conViver.Core.DTOs;
using conViver.Application.Services; // Changed
using conViver.Infrastructure.Authentication;
using Microsoft.AspNetCore.Authorization; // Adicionado
using System.Security.Claims; // Adicionado
using System; // Adicionado
using System.Threading.Tasks; // Adicionado

namespace conViver.API.Controllers;

[ApiController]
[Route("api/v1/auth")] // Rota base atualizada
public class UsuariosController : ControllerBase // Renomear para AuthController seria mais adequado
{
    private readonly UsuarioService _usuarios;
    private readonly JwtService _jwt;

    public UsuariosController(UsuarioService usuarios, JwtService jwt)
    {
        _usuarios = usuarios;
        _jwt = jwt;
    }

    /// <summary>
    /// Registra um novo usuário na plataforma.
    /// </summary>
    /// <param name="request">Dados para registro do novo usuário.</param>
    /// <returns>Informações básicas do usuário criado.</returns>
    /// <response code="201">Usuário criado com sucesso.</response>
    /// <response code="400">Dados de entrada inválidos.</response>
    /// <response code="409">E-mail já cadastrado.</response>
    [HttpPost("signup")]
    [AllowAnonymous] // Permitir acesso anônimo
    public async Task<ActionResult<SignupResponseDto>> Signup([FromBody] SignupRequestDto request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        // Adicionar validações manuais para CondominioId e UnidadeId
        if (request.CondominioId == null || request.CondominioId == Guid.Empty)
        {
            return BadRequest(new { error = "MISSING_CONDOMINIO_ID", message = "O CondominioId é obrigatório." });
        }

        if (request.UnidadeId == null || request.UnidadeId == Guid.Empty)
        {
            return BadRequest(new { error = "MISSING_UNIDADE_ID", message = "O UnidadeId é obrigatório." });
        }

        var existing = await _usuarios.GetByEmailAsync(request.Email);
        if (existing != null)
        {
            return Conflict(new { error = "EMAIL_EXISTS", message = "O e-mail fornecido já está em uso." });
        }

        var usuario = new Usuario
        {
            Id = Guid.NewGuid(),
            Nome = request.Nome,
            Email = request.Email,
            SenhaHash = request.Senha, // O serviço _usuarios.AddAsync deve cuidar do hashing da senha
            Perfil = PerfilUsuario.Morador, // Perfil padrão, pode ser ajustado conforme regras de negócio
            CondominioId = request.CondominioId!.Value, // Garantido não nulo pelas validações
            UnidadeId = request.UnidadeId!.Value // Garantido não nulo pelas validações
        };
        await _usuarios.AddAsync(usuario); // Assumindo que AddAsync faz o hash da senha

        var response = new SignupResponseDto
        {
            Id = usuario.Id,
            Email = usuario.Email,
            Perfil = usuario.Perfil.ToString().ToLowerInvariant()
        };
        // Idealmente, o path do Created deveria apontar para o endpoint GET /me ou GET /users/{id}
        return CreatedAtAction(nameof(GetMe), new { id = usuario.Id }, response);
    }

    /// <summary>
    /// Autentica um usuário e retorna tokens de acesso.
    /// </summary>
    /// <param name="request">Credenciais de login.</param>
    /// <returns>Tokens de acesso e informações do usuário.</returns>
    /// <response code="200">Login bem-sucedido.</response>
    /// <response code="401">Credenciais inválidas.</response>
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginRequestDto request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var usuario = await _usuarios.GetByEmailAsync(request.Email);
        if (usuario == null)
        {
            return Unauthorized(new { code = "INVALID_CREDENTIALS", message = "E-mail ou senha inválidos." });
        }

        var valid = await _usuarios.ValidatePasswordAsync(usuario, request.Senha);
        if (!valid)
        {
            return Unauthorized(new { code = "INVALID_CREDENTIALS", message = "E-mail ou senha inválidos." });
        }

        // TODO: Obter CondominioId e UnidadeId principal/ativa do usuário para incluir no token.
        // Exemplo:
        // Guid? condominioIdParaToken = usuario.CondominioPrincipalId; // Supondo que a entidade Usuario tenha essa propriedade
        // Guid? unidadeIdParaToken = usuario.UnidadePrincipalId; // Supondo que a entidade Usuario tenha essa propriedade
        // Esta informação é crucial para os outros controllers que dependem dela nas claims.
        // A JwtService.GenerateToken precisaria ser ajustada para incluir essas claims.
        // Por agora, vamos simular que o JwtService pode obter isso ou que não é estritamente necessário para o token em si,
        // mas sim para a resposta do DTO.

        // Simulação de dados para o token (o JwtService deveria lidar com isso de forma mais robusta)
        // O JwtService.GenerateToken idealmente retornaria claims adicionais, mas o serviço atual aceita apenas o condominioId opcional
        var accessTokenString = _jwt.GenerateToken(usuario.Id, usuario.Perfil.ToString(), usuario.CondominioId);

        // Placeholder para Refresh Token e Expiration - JwtService deveria fornecer isso
        var refreshTokenString = "dummyRefreshToken_jwtService_needs_to_implement_this_" + Guid.NewGuid().ToString();
        var accessTokenExpiration = DateTime.UtcNow.AddHours(1); // Exemplo, JwtService deve definir

        var userDto = new UserDto
        {
            Id = usuario.Id,
            Nome = usuario.Nome,
            Email = usuario.Email,
            Perfil = usuario.Perfil.ToString().ToLowerInvariant()
        };

        return Ok(new AuthResponseDto
        {
            AccessToken = accessTokenString,
            RefreshToken = refreshTokenString,
            AccessTokenExpiration = accessTokenExpiration,
            Usuario = userDto
        });
    }

    /// <summary>
    /// Obtém informações do usuário autenticado.
    /// </summary>
    /// <returns>Informações do usuário.</returns>
    /// <response code="200">Retorna informações do usuário.</response>
    /// <response code="401">Usuário não autenticado.</response>
    [HttpGet("me")]
    [Authorize] // Requer autenticação
    public async Task<ActionResult<UsuarioResponse>> GetMe() // Changed UserDto to UsuarioResponse
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid userId))
        {
            return Unauthorized("Token de usuário inválido.");
        }

        var usuarioResponse = await _usuarios.GetUsuarioByIdAsync(userId); // Changed to GetUsuarioByIdAsync
        if (usuarioResponse == null)
        {
            return NotFound("Usuário não encontrado.");
        }

        // usuarioResponse is already the DTO we want to return
        return Ok(usuarioResponse);
    }

    /// <summary>
    /// Gera um novo token de acesso usando um refresh token.
    /// </summary>
    /// <param name="request">O refresh token.</param>
    /// <returns>Novos tokens de acesso e refresh.</returns>
    /// <response code="200">Tokens atualizados com sucesso.</response>
    /// <response code="400">Refresh token inválido ou expirado.</response>
    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponseDto>> Refresh([FromBody] RefreshTokenRequestDto request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        // Lógica para validar o refresh token e gerar novos tokens (a ser implementada no JwtService ou UsuarioService)
        // var (newAccessToken, newRefreshToken, user) = await _jwt.RefreshTokenAsync(request.RefreshToken);
        // if (user == null) return BadRequest(new { error = "INVALID_REFRESH_TOKEN", message = "Refresh token inválido ou expirado." });

        // --- Simulação ---
        await Task.CompletedTask; // Para remover warning de async
        Guid mockUserId = Guid.NewGuid();
        string mockUserEmail = "user_refreshed@example.com";
        PerfilUsuario mockPerfil = PerfilUsuario.Morador;
        Guid? mockCondominioId = Guid.NewGuid();


        var newAccessTokenString = _jwt.GenerateToken(mockUserId, mockPerfil.ToString(), mockCondominioId);
        var newRefreshTokenString = "new_dummyRefreshToken_" + Guid.NewGuid().ToString();
        var newAccessTokenExpiration = DateTime.UtcNow.AddHours(1);
        var userDto = new UserDto
        { // This UserDto is from a different context (AuthResponseDto) and might be okay if defined locally or within AuthDtos
            Id = mockUserId,
            Nome = "Usuário Refrescado",
            Email = mockUserEmail,
            Perfil = mockPerfil.ToString().ToLowerInvariant()
            // CondominioId = mockCondominioId // CondominioId is not in the UserDto I defined/deleted. This UserDto might be different.
        };
        // --- Fim Simulação ---

        return Ok(new AuthResponseDto
        {
            AccessToken = newAccessTokenString,
            RefreshToken = newRefreshTokenString,
            AccessTokenExpiration = newAccessTokenExpiration,
            Usuario = userDto
        });
    }

    /// <summary>
    /// Solicita a redefinição de senha para um usuário.
    /// </summary>
    /// <param name="request">O e-mail do usuário.</param>
    /// <response code="200">Solicitação processada (não indica se o e-mail existe para evitar enumeração de usuários).</response>
    /// <response code="400">Dados de entrada inválidos.</response>
    [HttpPost("forgot-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequestDto request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        await _usuarios.SolicitarResetSenhaAsync(request.Email);
        // O serviço cuidaria de gerar um token, salvar e enviar e-mail.
        // Por segurança, não se deve confirmar se o e-mail existe ou não.

        // Simulação
        // await Task.CompletedTask; // No longer needed as we call the actual service
        return Ok(new { message = "Se um usuário com este e-mail existir em nosso sistema, um link para redefinição de senha foi enviado." });
    }

    /// <summary>
    /// Redefine a senha do usuário usando um token de reset.
    /// </summary>
    /// <param name="request">O token de reset e a nova senha.</param>
    /// <response code="200">Senha redefinida com sucesso.</response>
    /// <response code="400">Token inválido/expirado ou nova senha inválida.</response>
    [HttpPost("reset-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequestDto request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var sucesso = await _usuarios.ResetarSenhaAsync(request.ResetToken, request.NovaSenha);
        if (!sucesso)
        {
            return BadRequest(new { error = "RESET_FAILED", message = "Não foi possível redefinir a senha. O token pode ser inválido ou ter expirado." });
        }

        return Ok(new { message = "Senha redefinida com sucesso." });
    }

    // --- Endpoints de Gestão de Membros em Unidades (Síndico) ---
    // Nota: A API_REFERENCE usa {id} para unidadeId e {memberId} para o ID do membro/vínculo.

    /// <summary>
    /// (Síndico) Vincula um usuário existente a uma unidade do seu condomínio.
    /// </summary>
    /// <param name="unidadeId">ID da unidade.</param>
    /// <param name="request">Dados do usuário a ser vinculado.</param>
    /// <returns>Detalhes do membro vinculado.</returns>
    /// <response code="201">Usuário vinculado com sucesso.</response>
    /// <response code="400">Dados inválidos ou usuário já vinculado.</response>
    /// <response code="401">Não autorizado ou claims inválidas.</response>
    /// <response code="403">Não é Síndico.</response>
    /// <response code="404">Unidade ou usuário não encontrado.</response>
    [HttpPost("/api/v1/syndic/units/{unidadeId:guid}/members")] // Rota absoluta para evitar conflito com /auth
    [Authorize(Roles = "Sindico")]
    public async Task<ActionResult<MembroUnidadeDto>> VincularUsuarioUnidade(Guid unidadeId, [FromBody] VincularUsuarioUnidadeRequestDto request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var condominioIdClaim = User.FindFirstValue("condominioId");
        var sindicoUserIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier); // Síndico realizando a ação

        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId) ||
            string.IsNullOrEmpty(sindicoUserIdClaim) || !Guid.TryParse(sindicoUserIdClaim, out Guid sindicoUserId))
        {
            return Unauthorized("CondominioId ou UserId do Síndico não encontrado ou inválido no token.");
        }

        // Assumindo um método no UsuarioService ou um serviço dedicado (ex: UnidadeService, MembroService)
        // MembroUnidadeDto membroDto = await _usuarioService.VincularUsuarioAUnidadeAsync(condominioId, unidadeId, request.EmailUsuario, request.RelacaoComUnidade, sindicoUserId);

        // Simulação
        await Task.CompletedTask;
        var membroDto = new MembroUnidadeDto
        {
            MembroId = Guid.NewGuid(),
            UsuarioId = Guid.NewGuid(),
            NomeUsuario = "Nome Simulado do Usuário Vinculado",
            EmailUsuario = request.EmailUsuario,
            UnidadeId = unidadeId,
            RelacaoComUnidade = request.RelacaoComUnidade ?? "Morador",
            PerfilNaUnidade = PerfilUsuario.Morador, // Exemplo
            Ativo = true // Normalmente um vínculo novo pode começar como pendente ou ativo
        };

        if (membroDto == null) // Simular falha no serviço
        {
            return NotFound(new { message = "Unidade não encontrada ou usuário não pôde ser vinculado." });
        }
        // Idealmente, um endpoint para GET /syndic/units/{unidadeId}/members/{memberId} ou GET /syndic/members/{memberId}
        return CreatedAtAction(nameof(VincularUsuarioUnidade), new { unidadeId = unidadeId, memberId = membroDto.MembroId }, membroDto); // Ajustar nome da action se houver GetMemberById
    }

    /// <summary>
    /// (Síndico) Aprova, bloqueia ou atualiza o perfil de um membro em uma unidade.
    /// </summary>
    /// <param name="memberId">ID do membro/vínculo.</param>
    /// <param name="request">Dados para atualização (ex: status ativo/inativo).</param>
    /// <returns>Os dados atualizados do membro.</returns>
    /// <response code="200">Membro atualizado com sucesso.</response>
    /// <response code="400">Dados inválidos.</response>
    /// <response code="401">Não autorizado.</response>
    /// <response code="403">Não é Síndico.</response>
    /// <response code="404">Membro não encontrado.</response>
    [HttpPut("/api/v1/syndic/members/{memberId:guid}")]
    [Authorize(Roles = "Sindico")]
    public async Task<ActionResult<MembroUnidadeDto>> AtualizarMembro(Guid memberId, [FromBody] AtualizarMembroRequestDto request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var condominioIdClaim = User.FindFirstValue("condominioId");
        // var sindicoUserIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier); // Síndico realizando a ação

        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("CondominioId não encontrado ou inválido no token.");
        }

        // MembroUnidadeDto membroAtualizadoDto = await _usuarioService.AtualizarStatusMembroUnidadeAsync(condominioId, memberId, request.Ativo /*, request.PerfilNaUnidade*/);

        // Simulação
        await Task.CompletedTask;
        var membroAtualizadoDto = new MembroUnidadeDto
        {
            MembroId = memberId,
            UsuarioId = Guid.NewGuid(),
            NomeUsuario = "Nome Simulado Atualizado",
            EmailUsuario = "email_simulado@example.com",
            UnidadeId = Guid.NewGuid(),
            RelacaoComUnidade = "Morador",
            PerfilNaUnidade = PerfilUsuario.Morador,
            Ativo = request.Ativo
        };

        if (membroAtualizadoDto == null) return NotFound(new { message = "Membro não encontrado ou não pôde ser atualizado." });

        return Ok(membroAtualizadoDto);
    }

    /// <summary>
    /// (Síndico) Desvincula um usuário de uma unidade.
    /// </summary>
    /// <param name="memberId">ID do membro/vínculo a ser desvinculado.</param>
    /// <response code="204">Usuário desvinculado com sucesso.</response>
    /// <response code="401">Não autorizado.</response>
    /// <response code="403">Não é Síndico.</response>
    /// <response code="404">Membro não encontrado.</response>
    [HttpDelete("/api/v1/syndic/members/{memberId:guid}")]
    [Authorize(Roles = "Sindico")]
    public async Task<IActionResult> DesvincularUsuarioUnidade(Guid memberId)
    {
        var condominioIdClaim = User.FindFirstValue("condominioId");
        // var sindicoUserIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(condominioIdClaim) || !Guid.TryParse(condominioIdClaim, out Guid condominioId))
        {
            return Unauthorized("CondominioId não encontrado ou inválido no token.");
        }

        // bool sucesso = await _usuarioService.DesvincularUsuarioDeUnidadeAsync(condominioId, memberId);

        // Simulação
        await Task.CompletedTask;
        bool sucessoSimulado = true; // Simular sucesso
        if (!sucessoSimulado) return NotFound(new { message = "Membro não encontrado ou não pôde ser desvinculado." });

        return NoContent();
    }

    // --- Endpoints de Gestão de Usuários (Administradora/SuperAdmin) ---

    /// <summary>
    /// (Admin) Lista todos os usuários da plataforma.
    /// </summary>
    /// <param name="perfil">Filtra por perfil de usuário (opcional).</param>
    /// <param name="ativo">Filtra por status de ativação na plataforma (opcional).</param>
    /// <returns>Lista de usuários.</returns>
    /// <response code="200">Retorna a lista de usuários.</response>
    /// <response code="401">Não autorizado.</response>
    /// <response code="403">Não é Administradora ou SuperAdmin.</response>
    [HttpGet("/api/v1/adm/users")]
    [Authorize(Roles = "Administradora,SuperAdmin")] // Role "SuperAdmin" pode ser necessária
    public async Task<ActionResult<IEnumerable<AdminUserListDto>>> ListarUsuariosAdmin([FromQuery] PerfilUsuario? perfil, [FromQuery] bool? ativo)
    {
        //IEnumerable<AdminUserListDto> usuarios = await _usuarioService.ListarUsuariosPlataformaAsync(perfil, ativo);

        // Simulação
        await Task.CompletedTask;
        var usuarios = new List<AdminUserListDto> {
            new AdminUserListDto { Id = Guid.NewGuid(), Nome = "Admin User 1", Email = "admin1@example.com", PerfilGeral = PerfilUsuario.Administrador, IsAtivoPlataforma = true, DataCriacao = DateTime.UtcNow.AddDays(-10) },
            new AdminUserListDto { Id = Guid.NewGuid(), Nome = "Sindico User 1", Email = "sindico1@example.com", PerfilGeral = PerfilUsuario.Sindico, IsAtivoPlataforma = true, DataCriacao = DateTime.UtcNow.AddDays(-5) },
            new AdminUserListDto { Id = Guid.NewGuid(), Nome = "Morador User 1", Email = "morador1@example.com", PerfilGeral = PerfilUsuario.Morador, IsAtivoPlataforma = false, DataCriacao = DateTime.UtcNow.AddDays(-1) }
        };
        if (perfil.HasValue) usuarios = usuarios.Where(u => u.PerfilGeral == perfil.Value).ToList();
        if (ativo.HasValue) usuarios = usuarios.Where(u => u.IsAtivoPlataforma == ativo.Value).ToList();


        return Ok(usuarios);
    }
}
