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
    public string Email { get; set; } = string.Empty;
    public string Perfil { get; set; } = string.Empty;
}
