using System;
using System.Collections.Generic;

namespace conViver.Core.DTOs
{
    public class AtaVotacaoDto
    {
        public Guid VotacaoId { get; set; }
        public string TituloVotacao { get; set; } = string.Empty;
        public string Pergunta { get; set; } = string.Empty;
        public DateTime DataCriacao { get; set; }
        public DateTime? DataEncerramento { get; set; }
        public int TotalVotos { get; set; }
        public List<ResultadoOpcaoAtaDto> ResultadosPorOpcao { get; set; } = new List<ResultadoOpcaoAtaDto>();
        public string Observacoes { get; set; } = string.Empty; // Espaço para quorum, etc.
    }

    public class ResultadoOpcaoAtaDto
    {
        public string DescricaoOpcao { get; set; } = string.Empty;
        public int QuantidadeVotos { get; set; }
        public double Percentual { get; set; } // Em relação ao total de votos na enquete
    }
}
