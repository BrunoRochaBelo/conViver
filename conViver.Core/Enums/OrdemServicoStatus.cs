namespace conViver.Core.Enums;

public enum OrdemServicoStatus
{
    Aberta,
    EmAndamento,
    AguardandoPecas,
    AguardandoAprovacaoOrcamento,
    Concluida, // indicates service done, pending admin closure
    Encerrada, // admin reviewed and closed, final state
    Cancelada
}
