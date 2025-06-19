namespace conViver.Core.DTOs;

public class SignupRequest
{
    public string Nome { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Senha { get; set; } = string.Empty;
}

public class LoginRequest
{
    public string Email { get; set; } = string.Empty;
    public string Senha { get; set; } = string.Empty;
}

public class UsuarioResponse
{
    public Guid Id { get; set; }
    public string Nome { get; set; } = string.Empty; // Added
    public string Email { get; set; } = string.Empty;
    public string Perfil { get; set; } = string.Empty;
    public Guid UnidadeId { get; set; } // Added
    public bool Ativo { get; set; } // Added
}
