using System;
using System.Collections.Generic;

namespace conViver.Core.Entities;

public class OpcaoVotacao
{
    public Guid Id { get; set; }
    public Guid VotacaoId { get; set; } // Foreign key para Votacao
    public Votacao? Votacao { get; set; } // Navigation property
    public string Descricao { get; set; } = string.Empty;
    public List<VotoRegistrado> VotosRecebidos { get; set; } = new List<VotoRegistrado>();
}
