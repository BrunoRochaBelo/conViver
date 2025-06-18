using System;
using System.Collections.Generic;

namespace conViver.Core.DTOs
{
    public class CobrancaDto
    {
        public Guid Id { get; set; }
        public Guid UnidadeId { get; set; }
        public string? NomeSacado { get; set; } // Nome do responsável pela unidade
        public decimal Valor { get; set; }
        public DateTime DataVencimento { get; set; }
        public string StatusCobranca { get; set; } = string.Empty; // Ex: "Pendente", "Pago", "Atrasado", "Cancelado"
        public string? LinkSegundaVia { get; set; } // Opcional
    }

    public class NovaCobrancaDto
    {
        public Guid UnidadeId { get; set; }
        public decimal Valor { get; set; }
        public DateTime DataVencimento { get; set; }
        public string? Descricao { get; set; }
    }

    public class GeracaoLoteRequestDto
    {
        public int Mes { get; set; } // 1-12
        public int Ano { get; set; }
        public List<DescricaoPadraoDto>? DescricoesPadrao { get; set; } // Opcional, para itens recorrentes
    }

    public class DescricaoPadraoDto
    {
        public string Descricao { get; set; } = string.Empty;
        public decimal Valor { get; set; }
    }

    public class ResultadoOperacaoDto
    {
        public bool Sucesso { get; set; }
        public string Mensagem { get; set; } = string.Empty;
        public List<string>? Erros { get; set; }
    }


    public class DashboardFinanceiroCobrancasDto
    {
        public decimal InadimplenciaPercentual { get; set; }
        public decimal TotalPixMes { get; set; }
        public int TotalBoletosPendentes { get; set; }
    }
}
