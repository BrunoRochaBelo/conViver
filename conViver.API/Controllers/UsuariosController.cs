using Microsoft.AspNetCore.Mvc;
using conViver.Core.Entities;
using conViver.Core.Enums;
using conViver.Core.DTOs;
using conViver.Application;
using conViver.Infrastructure.Authentication;

namespace conViver.API.Controllers;

[ApiController]
[Route("auth")]
public class UsuariosController : ControllerBase
{
    private readonly UsuarioService _usuarios;
    private readonly JwtService _jwt;

    public UsuariosController(UsuarioService usuarios, JwtService jwt)
    {
        _usuarios = usuarios;
        _jwt = jwt;
    }

    [HttpPost("signup")]
    public async Task<ActionResult<UsuarioResponse>> Signup(SignupRequest request)
    {
        var existing = await _usuarios.GetByEmailAsync(request.Email);
        if (existing != null)
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
        await _usuarios.AddAsync(usuario);

        return Created(string.Empty, new UsuarioResponse
        {
            Id = usuario.Id,
            Email = usuario.Email,
            Perfil = usuario.Perfil.ToString().ToLowerInvariant()
        });
    }

    [HttpPost("login")]
    public async Task<ActionResult<object>> Login(LoginRequest request)
    {
        var usuario = await _usuarios.GetByEmailAsync(request.Email);
        if (usuario == null) return Unauthorized();

        var valid = await _usuarios.ValidatePasswordAsync(usuario, request.Senha);
        if (!valid) return Unauthorized();

        var token = _jwt.GenerateToken(usuario.Id, usuario.Perfil.ToString());
        return Ok(new { accessToken = token });
    }
}
