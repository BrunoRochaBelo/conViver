using System;

namespace conViver.Core.Entities;

public class VotoRegistrado
{
    public Guid Id { get; set; }
    public Guid OpcaoVotacaoId { get; set; } // Foreign key para OpcaoVotacao
    public OpcaoVotacao? OpcaoVotacao { get; set; } // Navigation property
    public Guid UsuarioId { get; set; } // Id do usuário que votou
    public Guid? UnidadeId { get; set; }
    public string? Ip { get; set; }
    public string? DeviceId { get; set; }
    public DateTime DataVoto { get; set; } = DateTime.UtcNow;
}
