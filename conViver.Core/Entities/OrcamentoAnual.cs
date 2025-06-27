using System;

namespace conViver.Core.Entities;

public class OrcamentoAnual
{
    public Guid Id { get; set; }
    public Guid CondominioId { get; set; }
    public int Ano { get; set; }
    public string Categoria { get; set; } = string.Empty;
    public decimal ValorPrevisto { get; set; }
}
