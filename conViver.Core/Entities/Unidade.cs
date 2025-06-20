using System.Collections.Generic; // Required for ICollection

namespace conViver.Core.Entities;

public class Unidade
{
    public Guid Id { get; set; }
    public Guid CondominioId { get; set; }
    public string Identificacao { get; set; } = string.Empty;
    public decimal FracaoIdeal { get; set; }
    public string Tipo { get; set; } = "residencial";

    public virtual ICollection<Usuario> Usuarios { get; set; } = new List<Usuario>();
}
