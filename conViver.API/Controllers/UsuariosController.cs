using Microsoft.AspNetCore.Mvc;
using conViver.Core.Entities;
using conViver.Core.Enums;
using conViver.Core.DTOs;

namespace conViver.API.Controllers;

[ApiController]
[Route("auth")]
public class UsuariosController : ControllerBase
{
    private static readonly List<Usuario> Usuarios = new();

    [HttpPost("signup")]
    public ActionResult<UsuarioResponse> Signup(SignupRequest request)
    {
        if (Usuarios.Any(u => u.Email.Equals(request.Email, StringComparison.OrdinalIgnoreCase)))
        {
            return Conflict(new { error = "EMAIL_EXISTS" });
        }

        var usuario = new Usuario
        {
            Id = Guid.NewGuid(),
            Nome = request.Nome,
            Email = request.Email,
            SenhaHash = request.Senha,
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
        var usuario = Usuarios.FirstOrDefault(u => u.Email == request.Email && u.SenhaHash == request.Senha);
        if (usuario == null) return Unauthorized();

        var token = Convert.ToBase64String(Guid.NewGuid().ToByteArray());
        return Ok(new { accessToken = token });
    }
}
