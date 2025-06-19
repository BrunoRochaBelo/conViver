namespace conViver.Core.Enums;

public enum ReservaStatus
{
    Pendente,
    Aprovada,
    Recusada,
    Confirmada, // Confirmada might be redundant if Aprovada is used. Or it means user confirmed attendance.
    Concluida,
    Cancelada,
    Bloqueada  // New status for maintenance blocks
}
