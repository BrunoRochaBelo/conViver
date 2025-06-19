using System;
using System.ComponentModel.DataAnnotations;

namespace conViver.Core.DTOs;

public class DespesaInputDto
{
    [Required(ErrorMessage = "A descrição da despesa é obrigatória.")]
    [StringLength(200, MinimumLength = 3, ErrorMessage = "A descrição deve ter entre 3 e 200 caracteres.")]
    public string Descricao { get; set; } = string.Empty;

    [Required(ErrorMessage = "O valor da despesa é obrigatório.")]
    [Range(0.01, 1000000, ErrorMessage = "O valor da despesa deve ser positivo.")]
    public decimal Valor { get; set; }

    [Required(ErrorMessage = "A data de competência é obrigatória.")]
    public DateTime DataCompetencia { get; set; } // Mês/Ano a que se refere a despesa

    public DateTime? DataVencimento { get; set; } // Data de pagamento limite

    [StringLength(100, ErrorMessage = "A categoria da despesa não pode exceder 100 caracteres.")]
    public string? Categoria { get; set; } // Ex: "Limpeza", "Manutenção", "Administrativa"

    [StringLength(500, ErrorMessage = "Observações não podem exceder 500 caracteres.")]
    public string? Observacoes { get; set; }

    // public Guid? FornecedorId { get; set; } // Futuramente, linkar com PrestadorServico
}

public class DespesaDto
{
    public Guid Id { get; set; } // Id do LancamentoFinanceiro
    public string Descricao { get; set; } = string.Empty;
    public decimal Valor { get; set; }
    public DateTime DataCompetencia { get; set; }
    public DateTime? DataVencimento { get; set; }
    public string? Categoria { get; set; }
    public string? Observacoes { get; set; }
    public DateTime DataRegistro { get; set; } // Quando foi lançada no sistema
    public string Status { get; set; } = string.Empty; // Ex: "Pendente", "Paga", "Atrasada", "Cancelada"
    public Guid? UsuarioRegistroId { get; set; }
    // public string? NomeUsuarioRegistro { get; set; }
    // public Guid? FornecedorId { get; set; }
    // public string? NomeFornecedor { get; set; }
}

// DTO para o Balancete
public class BalanceteDto
{
    public DateTime PeriodoInicio { get; set; }
    public DateTime PeriodoFim { get; set; }
    public decimal SaldoAnterior { get; set; }
    public List<BalanceteItemDto> Receitas { get; set; } = new List<BalanceteItemDto>();
    public List<BalanceteItemDto> Despesas { get; set; } = new List<BalanceteItemDto>();
    public decimal SaldoAtual { get; set; }
    public decimal TotalReceitas { get; set; }
    public decimal TotalDespesas { get; set; }
}

public class BalanceteItemDto
{
    public string Categoria { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    public decimal Valor { get; set; }
    public DateTime Data { get; set; }
}
