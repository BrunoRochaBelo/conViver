using conViver.Core.Enums;
using System;

namespace conViver.Core.DTOs;

public class VisitanteInputDto
{
    public Guid UnidadeId { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string? Documento { get; set; }
    // FotoUrl will be handled later
    public string? MotivoVisita { get; set; }
    public DateTime? HorarioSaidaPrevisto { get; set; }
    public string? Observacoes { get; set; }
}

public class VisitanteUpdateDto
{
    public string Nome { get; set; } = string.Empty;
    public string? Documento { get; set; }
    public string? MotivoVisita { get; set; }
    public DateTime? HorarioSaidaPrevisto { get; set; }
    public string? Observacoes { get; set; }
    public VisitanteStatus? Status { get; set; } // Optional: Allow status update directly? Or only via specific methods? For now, let's include it.
}

public class PreAutorizacaoVisitanteDto
{
    public Guid UnidadeId { get; set; } // ID of the unit of the resident doing the pre-authorization
    public Guid CondominoId { get; set; } // ID of the resident doing the pre-authorization
    public string NomeVisitante { get; set; } = string.Empty;
    public string? DocumentoVisitante { get; set; }
    public string? MotivoVisita { get; set; }
    public DateTime? HorarioEntradaPrevisto { get; set; } // When the visitor is expected
    public DateTime? HorarioSaidaPrevisto { get; set; } // When the visitor is expected to leave
    public DateTime? DataValidadePreAutorizacao { get; set; } // For the QR Code's validity
}

public class VisitanteDto
{
    public Guid Id { get; set; }
    public Guid UnidadeId { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string? Documento { get; set; }
    public string? FotoUrl { get; set; }
    public string? MotivoVisita { get; set; }
    public DateTime DataChegada { get; set; }
    public DateTime? DataSaida { get; set; }
    public DateTime? HorarioSaidaPrevisto { get; set; }
    public string? Observacoes { get; set; }
    public VisitanteStatus Status { get; set; }
    public string? QRCode { get; set; } // Only for specific scenarios, maybe not in a general list
    public Guid? PreAutorizadoPorCondominoId { get; set; }
    public DateTime? DataValidadePreAutorizacao { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Optional: Add related entity data if needed, e.g., Unidade details
    // public UnidadeDto Unidade { get; set; }
}

public class QRCodeValidationRequestDto
{
    public string QRCodeValue { get; set; } = string.Empty;
}
