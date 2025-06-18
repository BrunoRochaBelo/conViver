namespace conViver.Core.DTOs;

public class DashboardMetricsDto
{
    public decimal InadimplenciaPercentual { get; set; }
    public decimal InadimplenciaValorTotal { get; set; }
    public decimal SaldoDisponivel { get; set; }
    public List<ProximaDespesaDto> ProximasDespesas { get; set; } = new();
}

public class ProximaDespesaDto
{
    public Guid Id { get; set; }
    public string Descricao { get; set; } = string.Empty;
    public decimal Valor { get; set; }
    public DateTime DataVencimento { get; set; }
}

public class AlertaDto
{
    public Guid Id { get; set; }
    public string Titulo { get; set; } = string.Empty;
    public string Mensagem { get; set; } = string.Empty;
    public string Criticidade { get; set; } = "normal"; // ex: normal, alta, critica
    public DateTime DataCriacao { get; set; }
}

public class AtividadeRecenteDto
{
    public Guid Id { get; set; }
    public string Tipo { get; set; } = string.Empty; // "Chamado" ou "Aviso"
    public string Descricao { get; set; } = string.Empty;
    public DateTime DataOcorrencia { get; set; }
}

public class DashboardGeralDto
{
    public DashboardMetricsDto? Metricas { get; set; }
    public List<AlertaDto> Alertas { get; set; } = new();
    public List<AtividadeRecenteDto> AtividadesRecentes { get; set; } = new();
    // Adicionar aqui outros dados para o dashboard geral, se necessário
}
