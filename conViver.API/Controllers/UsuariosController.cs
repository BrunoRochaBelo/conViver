using Microsoft.AspNetCore.Mvc;
using conViver.Core.Entities;
using conViver.Core.Enums;
using System.Security.Cryptography;
using System.Text;
using conViver.Core.DTOs;
using conViver.Infrastructure.Authentication;

namespace conViver.API.Controllers;

[ApiController]
[Route("api/v1/auth")]
public class UsuariosController : ControllerBase
{
    private static readonly List<Usuario> Usuarios = new();
    private readonly JwtService _jwt;

    public UsuariosController(JwtService jwt)
    {
        _jwt = jwt;
    }

    private static string HashPassword(string password)
    {
        using var sha = SHA256.Create();
        var bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(password));
        return Convert.ToBase64String(bytes);
    }

    [HttpPost("signup")]
    public ActionResult<UsuarioResponse> Signup(SignupRequest request)
    {
        if (request.Senha.Length < 8)
        {
            return UnprocessableEntity(new { error = "VALIDATION_ERROR" });
        }

        if (Usuarios.Any(u => u.Email.Equals(request.Email, StringComparison.OrdinalIgnoreCase)))
        {
            return Conflict(new { error = "EMAIL_EXISTS" });
        }

        var usuario = new Usuario
        {
            Id = Guid.NewGuid(),
            Nome = request.Nome,
            Email = request.Email,
            SenhaHash = HashPassword(request.Senha),
            Perfil = PerfilUsuario.Morador
        };
        Usuarios.Add(usuario);

        return Created(string.Empty, new UsuarioResponse
        {
            Id = usuario.Id,
            Email = usuario.Email,
            Perfil = usuario.Perfil.ToString().ToLowerInvariant()
        });
    }

    [HttpPost("login")]
    public ActionResult<object> Login(LoginRequest request)
    {
        var hash = HashPassword(request.Senha);
        var usuario = Usuarios.FirstOrDefault(u => u.Email == request.Email && u.SenhaHash == hash);
        if (usuario == null)
        {
            return Unauthorized(new { error = "INVALID_CREDENTIALS" });
        }

        var token = _jwt.GenerateToken(usuario);
        return Ok(new { accessToken = token });
    }
}
