using System;
using System.ComponentModel.DataAnnotations;
using conViver.Core.Enums; // Para PerfilUsuario

namespace conViver.Core.DTOs;

// --- DTOs para Gestão de Membros em Unidades ---

public class VincularUsuarioUnidadeRequestDto
{
    [Required(ErrorMessage = "O Email do usuário é obrigatório.")]
    [EmailAddress(ErrorMessage = "Formato de e-mail inválido.")]
    public string EmailUsuario { get; set; } = string.Empty;

    // Opcional: O perfil do usuário na unidade pode ser definido aqui,
    // ou inferido/padrão (ex: Morador).
    // public PerfilUsuario PerfilNaUnidade { get; set; } = PerfilUsuario.Morador;

    [StringLength(100, ErrorMessage = "O nome do vínculo não pode exceder 100 caracteres.")]
    public string? RelacaoComUnidade { get; set; } // Ex: "Proprietário", "Inquilino", "Dependente"
}

public class MembroUnidadeDto // Resposta ao vincular ou listar membros
{
    public Guid MembroId { get; set; } // ID do vínculo ou do próprio usuário se for 1-1 com Usuario
    public Guid UsuarioId { get; set; }
    public string NomeUsuario { get; set; } = string.Empty;
    public string EmailUsuario { get; set; } = string.Empty;
    public Guid UnidadeId { get; set; }
    public string RelacaoComUnidade { get; set; } = string.Empty;
    public PerfilUsuario PerfilNaUnidade { get; set; }
    public bool Ativo { get; set; } = true; // Se o vínculo está ativo/aprovado
}

public class AtualizarMembroRequestDto
{
    [Required(ErrorMessage = "O status de ativação é obrigatório.")]
    public bool Ativo { get; set; } // true para aprovar/desbloquear, false para bloquear

    // Outros campos atualizáveis, como o perfil do membro na unidade, podem ser adicionados.
    // public PerfilUsuario? PerfilNaUnidade { get; set; }
}


// --- DTOs para Gestão de Usuários (Nível Admin/Plataforma) ---

public class AdminUserListDto // Para GET /adm/users
{
    public Guid Id { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public PerfilUsuario PerfilGeral { get; set; } // Perfil na plataforma
    public bool IsAtivoPlataforma { get; set; } = true; // Se o usuário está ativo na plataforma como um todo
    public DateTime DataCriacao { get; set; }
    // public List<CondominioVinculadoDto> Condominios { get; set; } // Se relevante mostrar a quais condominios está vinculado
}

// public class AdminUserDetailsDto : AdminUserListDto { ... } // Detalhes adicionais

public class AdminUpdateUserDto // Para PUT /adm/users/{id}
{
    [StringLength(100, MinimumLength = 3)]
    public string? Nome { get; set; }

    [EmailAddress]
    public string? Email { get; set; }

    public PerfilUsuario? PerfilGeral { get; set; }
    public bool? IsAtivoPlataforma { get; set; }
    // Não permite alterar senha diretamente aqui; usar fluxo de reset ou endpoint específico.
}
