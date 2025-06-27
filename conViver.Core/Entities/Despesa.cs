using System;

namespace conViver.Core.Entities;

public class Despesa
{
    public Guid Id { get; set; }
    public Guid CondominioId { get; set; }
    public string Descricao { get; set; } = string.Empty;
    public decimal Valor { get; set; }
    public DateTime DataCompetencia { get; set; }
    public DateTime? DataVencimento { get; set; }
    public string? Categoria { get; set; }
    public string? Observacoes { get; set; }
    public DateTime DataRegistro { get; set; } = DateTime.UtcNow;
    public string Status { get; set; } = string.Empty;
    public Guid? UsuarioRegistroId { get; set; }
    public Usuario? UsuarioRegistro { get; set; }
}
