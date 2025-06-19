using System;
using System.Collections.Generic;

namespace conViver.Core.Entities;

public class PrestadorServico
{
    public Guid Id { get; set; }
    public Guid CondominioId { get; set; } // Adicionado
    public string Nome { get; set; } = string.Empty;
    public string? RazaoSocial { get; set; }
    public string? Telefone { get; set; }
    public string? Email { get; set; } // Adicionado
    public string? CpfCnpj { get; set; } // Adicionado - CNPJ ou CPF
    public string? DocumentosObrigatorios { get; set; }
    public string? Especialidade { get; set; }
    public string? EnderecoCompleto { get; set; } // Adicionado
    public double? RatingMedio { get; set; } // Ajustado de Rating (decimal?) para double?
    public bool Ativo { get; set; } = true; // Adicionado

    public virtual ICollection<AvaliacaoPrestador> Avaliacoes { get; set; } = new List<AvaliacaoPrestador>(); // Adicionado

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
