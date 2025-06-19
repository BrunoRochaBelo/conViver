using System;
using conViver.Core.Enums;

namespace conViver.Core.DTOs;

public class EncomendaInputDto
{
    public Guid UnidadeId { get; set; }
    public string? Descricao { get; set; }
    public string? CodigoRastreio { get; set; }
    public string? Remetente { get; set; }
    public string? Observacoes { get; set; }
}

public class EncomendaDto
{
    public Guid Id { get; set; }
    public Guid UnidadeId { get; set; }
    public string? Descricao { get; set; }
    public DateTime RecebidoEm { get; set; }
    public DateTime? RetiradoEm { get; set; }
    public EncomendaStatus Status { get; set; }
    public string? CodigoRastreio { get; set; }
    public string? Remetente { get; set; }
    public string? Observacoes { get; set; }
}
