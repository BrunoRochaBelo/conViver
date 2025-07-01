using conViver.Core.Enums;
using System; // Necessário para Guid?

namespace conViver.Core.Entities;

public class Reserva
{
    public Guid Id { get; set; }
    public Guid CondominioId { get; set; }
    public Guid UnidadeId { get; set; } // Unidade que fez a reserva
    public Guid UsuarioId { get; set; } // Usuário (morador/inquilino) que solicitou a reserva

    public Guid EspacoComumId { get; set; } // Chave estrangeira para EspacoComum
    public virtual EspacoComum? EspacoComum { get; set; } // Propriedade de navegação

    public DateTime Inicio { get; set; }
    public DateTime Fim { get; set; }
    public ReservaStatus Status { get; set; } = ReservaStatus.Pendente;
    public decimal? Taxa { get; set; } // Taxa efetivamente cobrada pela reserva

    public string? Observacoes { get; set; } // Observações do solicitante

    public Guid? AprovadorId { get; set; } // ID do usuário (síndico/admin) que aprovou/recusou
    public string? JustificativaAprovacaoRecusa { get; set; } // Justificativa do síndico

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Novos campos conforme plano
    public bool NotificadoLembrete24h { get; set; } = false;
    public string? TituloParaMural { get; set; }


    // Propriedades de navegação para Unidade e Usuario (opcionais)
    public virtual Unidade? Unidade { get; set; }
    public virtual Usuario? Solicitante { get; set; } // Mapeado para UsuarioId
    public virtual Usuario? Aprovador { get; set; } // Mapeado para AprovadorId
}
