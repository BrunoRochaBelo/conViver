using System;

namespace conViver.Core.DTOs
{
    public class FeedItemDto
    {
        public string ItemType { get; set; } = string.Empty; // e.g., "Aviso", "Enquete", "Chamado", "Ocorrencia", "Documento", "Encomenda", "BoletoLembrete", "Reserva"
        public Guid Id { get; set; } // Original ID of the item
        public Guid CriadoPor { get; set; } // Autor ou criador do item
        public string Titulo { get; set; } = string.Empty;
        public string Resumo { get; set; } = string.Empty; // A short description or snippet
        public DateTime DataHoraPrincipal { get; set; } // The main date/time for sorting, e.g., DataPublicacao, DataAbertura, DataVencimento
        public DateTime DataHoraAtualizacao { get; set; } // Used for secondary sorting or display
        public int PrioridadeOrdenacao { get; set; } // 0 for top-fixed, 1 for normal
        public string? UrlDestino { get; set; } // Link to the item's detail page/modal trigger
        public string? Icone { get; set; } // A class name or identifier for an icon
        public string? Status { get; set; } // Status of the item, if applicable
        public string? Categoria { get; set; } // Original category of the item
        public object? DetalhesAdicionais { get; set; } // Optional: for any extra info specific to the item type
    }
}
