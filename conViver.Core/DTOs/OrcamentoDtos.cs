using System;
using System.Collections.Generic;

namespace conViver.Core.DTOs;

public class OrcamentoCategoriaInputDto
{
    public string Categoria { get; set; } = string.Empty;
    public decimal ValorPrevisto { get; set; }
}

public class OrcamentoAnualDto
{
    public Guid Id { get; set; }
    public int Ano { get; set; }
    public string Categoria { get; set; } = string.Empty;
    public decimal ValorPrevisto { get; set; }
}

public class OrcamentoComparativoDto
{
    public string Categoria { get; set; } = string.Empty;
    public decimal ValorPrevisto { get; set; }
    public decimal ValorExecutado { get; set; }
}
