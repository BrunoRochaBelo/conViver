using System.Collections.Generic;

namespace conViver.Core.Entities;

public class Votacao
{
    public Guid Id { get; set; }
    public Guid CondominioId { get; set; }
    public string Titulo { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty; // Tornando não-nula conforme DTO, mas pode ser string.Empty
    public DateTime DataInicio { get; set; } = DateTime.UtcNow;
    public DateTime? DataFim { get; set; } // Alterado para nullable
    public string Status { get; set; } = string.Empty; // Ex: Aberta, Encerrada, Apurada
    public List<OpcaoVotacao> Opcoes { get; set; } = new List<OpcaoVotacao>();
    public Guid CriadoPor { get; set; } // Adicionado

    // Propriedades de auditoria padrão, se aplicável (ex: CreatedAt, UpdatedAt)
    // public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    // public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
