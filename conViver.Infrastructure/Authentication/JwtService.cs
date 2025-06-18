using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using conViver.Core.Entities;

namespace conViver.Infrastructure.Authentication;

public class JwtService
{
    private readonly AuthConfiguration _config;
    private readonly byte[] _keyBytes;

    public JwtService(IOptions<AuthConfiguration> options)
    {
        _config = options.Value;
        _keyBytes = Encoding.UTF8.GetBytes(_config.Secret);
    }

    public string GenerateToken(Usuario usuario)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, usuario.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, usuario.Email),
            new(ClaimTypes.Role, usuario.Perfil.ToString().ToLowerInvariant())
        };

        var key = new SymmetricSecurityKey(_keyBytes);
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: _config.Issuer,
            audience: _config.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_config.ExpirationMinutes),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
