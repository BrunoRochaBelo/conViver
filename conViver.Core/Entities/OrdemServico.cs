using conViver.Core.Enums;
using System; // Required for Guid, DateTime

namespace conViver.Core.Entities;

public class OrdemServico
{
    // Existing Fields (verified or adjusted)
    public Guid Id { get; set; }
    public Guid UnidadeId { get; set; } // Kept as non-nullable Guid
    public Guid? PrestadorId { get; set; } // Treated as PrestadorServicoId
    public OrdemServicoStatus Status { get; set; } = OrdemServicoStatus.Aberta;
    public DateTime CriadoEm { get; set; } = DateTime.UtcNow; // Treated as DataAbertura
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Renamed Fields
    public string? DescricaoProblema { get; set; } // Renamed from Descricao (original description by user)
    public DateTime? DataConclusao { get; set; } // Renamed from ConcluidoEm

    // New Fields
    public Guid CondominioId { get; set; }
    public Guid UsuarioSolicitanteId { get; set; } // User who requested the OS
    public string Titulo { get; set; } = string.Empty;
    public string? DescricaoServico { get; set; } // Detailed description, often by admin/provider
    public string Local { get; set; } = string.Empty; // E.g., "Salão de Festas", "Bloco A - Garagem", "Unidade 101"
    public string CategoriaServico { get; set; } = string.Empty; // E.g., "Elétrica", "Hidráulica"
    public string Prioridade { get; set; } = string.Empty; // E.g. "Baixa", "Media", "Alta", "Urgente"
    public DateTime? DataAgendamento { get; set; }
    public decimal? CustoEstimado { get; set; }
    public decimal? CustoFinal { get; set; }
    public string? Anexos { get; set; } // JSON string for list of URLs or paths
    public string? ObservacoesSindico { get; set; }
    public string? RelatorioFinal { get; set; }
    public bool ImpactoColetivo { get; set; } = false;
    public bool AvisoMuralGerado { get; set; } = false;
}
