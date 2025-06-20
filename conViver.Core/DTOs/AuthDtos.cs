using System.ComponentModel.DataAnnotations;

namespace conViver.Core.DTOs;

// --- Request DTOs ---

public class SignupRequestDto
{
    [Required(ErrorMessage = "O nome é obrigatório.")]
    [StringLength(100, MinimumLength = 3, ErrorMessage = "O nome deve ter entre 3 e 100 caracteres.")]
    public string Nome { get; set; } = string.Empty;

    [Required(ErrorMessage = "O e-mail é obrigatório.")]
    [EmailAddress(ErrorMessage = "Formato de e-mail inválido.")]
    [StringLength(100, ErrorMessage = "O e-mail não pode exceder 100 caracteres.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "A senha é obrigatória.")]
    [StringLength(100, MinimumLength = 6, ErrorMessage = "A senha deve ter pelo menos 6 caracteres.")]
    public string Senha { get; set; } = string.Empty;

    // Opcional: Se o signup já vincula a um condomínio/unidade
    public Guid? CondominioId { get; set; }
    public Guid? UnidadeId { get; set; }
    // public string? CodigoConvite { get; set; }
}

public class LoginRequestDto
{
    [Required(ErrorMessage = "O e-mail é obrigatório.")]
    [EmailAddress(ErrorMessage = "Formato de e-mail inválido.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "A senha é obrigatória.")]
    public string Senha { get; set; } = string.Empty;
}

public class RefreshTokenRequestDto
{
    [Required(ErrorMessage = "O refresh token é obrigatório.")]
    public string RefreshToken { get; set; } = string.Empty;
}

public class ForgotPasswordRequestDto
{
    [Required(ErrorMessage = "O e-mail é obrigatório.")]
    [EmailAddress(ErrorMessage = "Formato de e-mail inválido.")]
    public string Email { get; set; } = string.Empty;
}

public class ResetPasswordRequestDto
{
    [Required(ErrorMessage = "O token de reset é obrigatório.")]
    public string ResetToken { get; set; } = string.Empty;

    [Required(ErrorMessage = "A nova senha é obrigatória.")]
    [StringLength(100, MinimumLength = 6, ErrorMessage = "A nova senha deve ter pelo menos 6 caracteres.")]
    public string NovaSenha { get; set; } = string.Empty;
}


// --- Response DTOs ---

public class AuthResponseDto
{
    public string AccessToken { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty; // Incluir refresh token na resposta de login
    public DateTime AccessTokenExpiration { get; set; }
    public UserDto Usuario { get; set; } = null!;
}

public class UserDto // Para /auth/me e para incluir em AuthResponseDto
{
    public Guid Id { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Perfil { get; set; } = string.Empty; // Ex: "Morador", "Sindico"
    public Guid? CondominioId { get; set; } // Condomínio principal/ativo do usuário
    public Guid? UnidadeId { get; set; } // Unidade principal/ativa do usuário
    // Outras informações relevantes podem ser adicionadas aqui
}

// DTO simples para resposta de signup, se não retornar o token сразу
public class SignupResponseDto
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Perfil { get; set; } = string.Empty;
}
