using System;
using System.Collections.Generic;

namespace conViver.Core.Entities;

public class Chamado
{
    public Guid Id { get; set; }
    public Guid CondominioId { get; set; }
    public Guid? UnidadeId { get; set; } // Opcional, se o chamado for específico de uma unidade
    public Guid UsuarioId { get; set; } // Quem abriu o chamado

    public string Titulo { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;

    // Para EF Core, List<string> pode ser mapeado para JSON ou uma tabela separada com um ValueConverter.
    // Por padrão, alguns provedores (como PostgreSQL com Npgsql) podem lidar com isso.
    // Para SQL Server, um ValueConverter para serializar/desserializar para nvarchar(max) é comum.
    public List<string> Fotos { get; set; } = new List<string>();

    public string Status { get; set; } = string.Empty; // Ex: "Aberto", "EmAndamento", "Concluido", "Cancelado"
    public DateTime DataAbertura { get; set; }
    public DateTime? DataResolucao { get; set; }

    public string? RespostaDoSindico { get; set; }
    public int? AvaliacaoNota { get; set; } // Ex: 1 a 5 estrelas
    public string? AvaliacaoComentario { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Relacionamentos (opcional, dependendo da necessidade de navegação direta)
    // public Usuario? Usuario { get; set; }
    // public Unidade? Unidade { get; set; }
}
