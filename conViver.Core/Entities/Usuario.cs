using conViver.Core.Enums;

namespace conViver.Core.Entities;

public class Usuario
{
    public Guid Id { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string SenhaHash { get; set; } = string.Empty;
    public string? Telefone { get; set; }
    public PerfilUsuario Perfil { get; set; } = PerfilUsuario.Morador;
    public bool Ativo { get; set; } = true;
    public string? TwoFaSecret { get; set; }
    public string? PasswordResetToken { get; set; }
    public DateTime? PasswordResetTokenExpiry { get; set; }

    // Ligação direta com o condomínio do usuário para facilitar consultas
    public Guid CondominioId { get; set; }

    // Relacionamento com Unidade
    public Guid UnidadeId { get; set; } // Foreign Key
    public virtual Unidade? Unidade { get; set; } // Navigation property

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
