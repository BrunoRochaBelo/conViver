using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace conViver.Infrastructure.Authentication;

public class JwtService
{
    private readonly AuthConfiguration _config;

    public JwtService(AuthConfiguration config)
    {
        _config = config;
    }

    public string GenerateToken(Guid userId, string role, Guid? condominioId = null)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new("role", role)
        };

        if (condominioId.HasValue)
        {
            claims.Add(new Claim("condoId", condominioId.Value.ToString()));
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config.JwtSecret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expires = DateTime.UtcNow.AddMinutes(_config.ExpirationMinutes);

        var token = new JwtSecurityToken(
            claims: claims,
            expires: expires,
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
