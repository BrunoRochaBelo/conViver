using System;

namespace conViver.Core.Entities;

public class AvaliacaoPrestador
{
    public Guid Id { get; set; }
    public Guid PrestadorServicoId { get; set; }
    public virtual PrestadorServico? PrestadorServico { get; set; } // Navigation Property
    public Guid UsuarioId { get; set; } // Usuário que avaliou
    public Guid CondominioId { get; set; } // Para facilitar consultas/filtros por condomínio
    public int Nota { get; set; } // Ex: 1 a 5
    public string? Comentario { get; set; }
    public DateTime DataAvaliacao { get; set; } = DateTime.UtcNow;
    public Guid? OrdemServicoId { get; set; } // Opcional: Vínculo com a OS que originou a avaliação

    // Relacionamento opcional com Usuario, se necessário para buscar dados do avaliador.
    // public virtual Usuario? Avaliador { get; set; }
}
