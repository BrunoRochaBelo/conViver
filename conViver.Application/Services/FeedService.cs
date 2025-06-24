using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using conViver.Core.DTOs;
using conViver.Core.Entities; // Assuming some entities might be used directly or for mapping
using conViver.Application.Services; // For other services like AvisoService, etc.
using conViver.Core.Interfaces; // For IRepository
using Microsoft.EntityFrameworkCore; // For ToListAsync

namespace conViver.Application.Services
{
    public class FeedService
    {
        private readonly AvisoService _avisoService;
        private readonly VotacaoService _votacaoService;
        private readonly ChamadoService _chamadoService;
        private readonly OcorrenciaService _ocorrenciaService;
        private readonly DocumentoService _documentoService;
        private readonly EncomendaService _encomendaService;
        private readonly FinanceiroService _financeiroService;
        private readonly ReservaService _reservaService;
        private readonly OrdemServicoService _ordemServicoService;
        private readonly IRepository<Votacao> _votacaoRepository;
        private readonly IRepository<Encomenda> _encomendaRepository;
        private readonly IRepository<Usuario> _usuarioRepository;
        private readonly IRepository<Unidade> _unidadeRepository;
        private readonly IRepository<Reserva> _reservaRepository; // Added for Reserva queries

        public FeedService(
            AvisoService avisoService,
            VotacaoService votacaoService,
            IRepository<Votacao> votacaoRepository,
            ChamadoService chamadoService,
            OcorrenciaService ocorrenciaService,
            DocumentoService documentoService,
            EncomendaService encomendaService,
            IRepository<Encomenda> encomendaRepository,
            IRepository<Usuario> usuarioRepository,
            IRepository<Unidade> unidadeRepository,
            IRepository<Reserva> reservaRepository, // Added
            FinanceiroService financeiroService,
            ReservaService reservaService,
            OrdemServicoService ordemServicoService)
        {
            _avisoService = avisoService;
            _votacaoService = votacaoService;
            _votacaoRepository = votacaoRepository;
            _chamadoService = chamadoService;
            _ocorrenciaService = ocorrenciaService;
            _documentoService = documentoService;
            _encomendaService = encomendaService;
            _encomendaRepository = encomendaRepository;
            _usuarioRepository = usuarioRepository;
            _unidadeRepository = unidadeRepository;
            _reservaRepository = reservaRepository; // Added
            _financeiroService = financeiroService;
            _reservaService = reservaService;
            _ordemServicoService = ordemServicoService;
        }

        public async Task<IEnumerable<FeedItemDto>> GetFeedAsync(
            Guid condominioId,
            Guid usuarioId,
            int pageNumber,
            int pageSize,
            string? categoriaFiltro,
            DateTime? periodoInicio,
            DateTime? periodoFim,
            CancellationToken ct = default)
        {
            var allFeedItems = new List<FeedItemDto>();

            // Fetch and transform data from each source
            allFeedItems.AddRange(await FetchAvisosAsync(condominioId, usuarioId, ct));
            allFeedItems.AddRange(await FetchEnquetesAsync(condominioId, usuarioId, ct));
            allFeedItems.AddRange(await FetchChamadosAsync(condominioId, usuarioId, ct));
            allFeedItems.AddRange(await FetchOcorrenciasAsync(condominioId, usuarioId, ct));
            allFeedItems.AddRange(await FetchEncomendasPendentesAsync(condominioId, usuarioId, ct));
            allFeedItems.AddRange(await FetchLembretesBoletoAsync(condominioId, usuarioId, ct));
            allFeedItems.AddRange(await FetchDocumentosRecentesAsync(condominioId, usuarioId, ct));
            allFeedItems.AddRange(await FetchReservasConfirmadasAsync(condominioId, usuarioId, ct));
            allFeedItems.AddRange(await FetchOrdensServicoAsync(condominioId, usuarioId, ct));

            // Apply category and period filters
            var filteredItems = allFeedItems.AsQueryable();

            if (!string.IsNullOrEmpty(categoriaFiltro))
            {
                filteredItems = filteredItems.Where(item => item.Categoria == categoriaFiltro || item.ItemType == categoriaFiltro);
            }

            if (periodoInicio.HasValue)
            {
                filteredItems = filteredItems.Where(item => item.DataHoraPrincipal >= periodoInicio.Value);
            }

            if (periodoFim.HasValue)
            {
                filteredItems = filteredItems.Where(item => item.DataHoraPrincipal <= periodoFim.Value);
            }

            // Implement sorting
            var sortedItems = filteredItems
                .OrderBy(item => item.PrioridadeOrdenacao) // Top-fixed items first
                .ThenByDescending(item => item.DataHoraPrincipal); // Then by main date descending

            // Implement pagination
            var paginatedItems = sortedItems
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToList(); // Execute query

            return paginatedItems;
        }

        // Placeholder for private helper methods
        private async Task<IEnumerable<FeedItemDto>> FetchAvisosAsync(Guid condominioId, Guid usuarioId, CancellationToken ct)
        {
            var avisos = await _avisoService.ListarAsync(condominioId, ct);
            var feedItems = new List<FeedItemDto>();

            foreach (var aviso in avisos)
            {
                feedItems.Add(new FeedItemDto
                {
                    ItemType = "Aviso",
                    Id = aviso.Id,
                    Titulo = aviso.Titulo,
                    Resumo = TruncateString(aviso.Corpo, 100) ?? "Consulte para mais detalhes.", // Simple truncation
                    DataHoraPrincipal = aviso.PublicadoEm,
                    DataHoraAtualizacao = aviso.UpdatedAt,
                    PrioridadeOrdenacao = "urgente".Equals(aviso.Categoria, StringComparison.OrdinalIgnoreCase) ? 0 : 1,
                    UrlDestino = $"/app/avisos/{aviso.Id}", // Example URL
                    Icone = "icon-aviso", // Example icon class
                    Status = null, // Avisos might not have a distinct status for the feed view itself
                    Categoria = aviso.Categoria,
                    DetalhesAdicionais = new { aviso.Corpo } // Optional: send full body if needed by UI
                });
            }
            return feedItems;
        }

        private async Task<IEnumerable<FeedItemDto>> FetchEnquetesAsync(Guid condominioId, Guid usuarioId, CancellationToken ct)
        {
            var feedItems = new List<FeedItemDto>();

            // Fetch active enquetes (prioritized)
            var enquetesAbertas = await _votacaoService.ListarAbertasAsync(condominioId, ct);
            foreach (var enquete in enquetesAbertas)
            {
                feedItems.Add(new FeedItemDto
                {
                    ItemType = "Enquete",
                    Id = enquete.Id,
                    Titulo = enquete.Titulo,
                    Resumo = $"Enquete aberta. Término em: {enquete.DataFim?.ToString("dd/MM/yyyy HH:mm") ?? "Não definido"}",
                    DataHoraPrincipal = enquete.DataInicio, // Or DataFim for sorting by end time? For now, DataInicio
                    DataHoraAtualizacao = enquete.DataInicio, // Assuming no separate UpdatedAt for VotacaoResumoDto
                    PrioridadeOrdenacao = 0, // Active enquetes are top-fixed
                    UrlDestino = $"/app/enquetes/{enquete.Id}",
                    Icone = "icon-enquete-ativa",
                    Status = enquete.Status, // "Aberta"
                    Categoria = "Votação", // Or some other relevant category
                    DetalhesAdicionais = null // VotacaoResumoDto is already lean
                });
            }

            // Fetch recently closed enquetes (non-prioritized)
            // This demonstrates fetching other types of enquetes.
            // We might need a dedicated method in VotacaoService or use IRepository<Votacao> here.
            // For now, using IRepository<Votacao> as a placeholder for this capability.
            var enquetesFechadasRecentemente = await _votacaoRepository.Query()
                .Where(v => v.CondominioId == condominioId &&
                             v.Status != "Aberta" &&
                             v.DataFim >= DateTime.UtcNow.AddDays(-7)) // Example: closed in the last 7 days
                .OrderByDescending(v => v.DataFim)
                .Take(5) // Limit to a few recent ones
                .Select(v => new VotacaoResumoDto // Assuming we map to a similar DTO or use the entity directly
                {
                    Id = v.Id,
                    Titulo = v.Titulo,
                    DataInicio = v.DataInicio,
                    DataFim = v.DataFim,
                    Status = v.Status
                    // Descricao = v.Descricao // Add if needed for Resumo
                })
                .ToListAsync(ct);

            foreach (var enquete in enquetesFechadasRecentemente)
            {
                feedItems.Add(new FeedItemDto
                {
                    ItemType = "Enquete",
                    Id = enquete.Id,
                    Titulo = enquete.Titulo,
                    Resumo = $"Enquete encerrada em: {enquete.DataFim?.ToString("dd/MM/yyyy HH:mm") ?? "Data não disponível"}",
                    DataHoraPrincipal = enquete.DataFim ?? enquete.DataInicio, // Use DataFim for closed ones
                    DataHoraAtualizacao = enquete.DataFim ?? enquete.DataInicio, // Or an UpdatedAt field if available
                    PrioridadeOrdenacao = 1, // Non-prioritized
                    UrlDestino = $"/app/enquetes/{enquete.Id}/resultados",
                    Icone = "icon-enquete-fechada",
                    Status = enquete.Status,
                    Categoria = "Votação",
                    DetalhesAdicionais = null
                });
            }

            return feedItems;
        }

        private async Task<IEnumerable<FeedItemDto>> FetchChamadosAsync(Guid condominioId, Guid usuarioId, CancellationToken ct)
        {
            // Assuming we want all statuses for the feed, null for status filter
            var chamados = await _chamadoService.ListarChamadosPorUsuarioAsync(condominioId, usuarioId, null, ct);
            var feedItems = new List<FeedItemDto>();

            foreach (var chamado in chamados)
            {
                feedItems.Add(new FeedItemDto
                {
                    ItemType = "Chamado",
                    Id = chamado.Id,
                    Titulo = chamado.Titulo,
                    Resumo = TruncateString(chamado.Descricao, 100) ?? "Consulte para mais detalhes.",
                    DataHoraPrincipal = chamado.DataAbertura,
                    // ChamadoDto does not have UpdatedAt. Using DataAbertura or DataResolucao if available.
                    DataHoraAtualizacao = chamado.DataResolucao ?? chamado.DataAbertura,
                    PrioridadeOrdenacao = 1, // Normal priority for chamados
                    UrlDestino = $"/app/chamados/{chamado.Id}",
                    Icone = "icon-chamado",
                    Status = chamado.Status,
                    Categoria = "Atendimento", // Or some other relevant category for chamados
                    DetalhesAdicionais = new { chamado.RespostaDoSindico }
                });
            }
            return feedItems;
        }

        private async Task<IEnumerable<FeedItemDto>> FetchOcorrenciasAsync(Guid condominioId, Guid usuarioId, CancellationToken ct)
        {
            // Assuming we want all statuses and types for the feed, null for status/tipo filters
            var ocorrencias = await _ocorrenciaService.ListarOcorrenciasPorUsuarioAsync(condominioId, usuarioId, null, null);
            var feedItems = new List<FeedItemDto>();

            foreach (var ocorrencia in ocorrencias)
            {
                feedItems.Add(new FeedItemDto
                {
                    ItemType = "Ocorrencia",
                    Id = ocorrencia.Id,
                    Titulo = ocorrencia.Titulo,
                    Resumo = TruncateString(ocorrencia.Descricao, 100) ?? "Consulte para mais detalhes.",
                    DataHoraPrincipal = ocorrencia.DataAbertura,
                    DataHoraAtualizacao = ocorrencia.DataAtualizacao,
                    PrioridadeOrdenacao = 1, // Normal priority
                    UrlDestino = $"/app/ocorrencias/{ocorrencia.Id}",
                    Icone = "icon-ocorrencia",
                    Status = ocorrencia.Status,
                    Categoria = ocorrencia.Categoria,
                    DetalhesAdicionais = null
                });
            }
            return feedItems;
        }

        private async Task<IEnumerable<FeedItemDto>> FetchEncomendasPendentesAsync(Guid condominioId, Guid usuarioId, CancellationToken ct)
        {
            var feedItems = new List<FeedItemDto>();
            var usuario = await _usuarioRepository.GetByIdAsync(usuarioId, ct);

            if (usuario == null) // Usuario.UnidadeId is Guid (non-nullable), so only check if user exists
            {
                return feedItems;
            }

            var unidadeId = usuario.UnidadeId; // Direct access, UnidadeId is non-nullable Guid on Usuario

            // Verify if the user's Unidade belongs to the provided CondominioId
            var unidade = await _unidadeRepository.GetByIdAsync(unidadeId, ct);
            if (unidade == null || unidade.CondominioId != condominioId)
            {
                // This unidade does not belong to the expected condominio, or unidade not found.
                // This check ensures data integrity and security.
                return feedItems;
            }

            // Fetch encomendas for the user's unidade
            var encomendas = await _encomendaRepository.Query()
                .Where(e => e.UnidadeId == unidadeId) // Corrected: Encomenda does not have CondominioId directly
                .OrderByDescending(e => e.RecebidoEm)
                .ToListAsync(ct);

            foreach (var encomenda in encomendas)
            {
                bool isPendente = encomenda.Status == Core.Enums.EncomendaStatus.AguardandoRetirada;

                feedItems.Add(new FeedItemDto
                {
                    ItemType = "Encomenda",
                    Id = encomenda.Id,
                    Titulo = $"Encomenda: {encomenda.Remetente ?? "Origem desconhecida"}",
                    Resumo = encomenda.Descricao ?? $"Código: {encomenda.CodigoRastreio ?? "N/A"}. Observações: {encomenda.Observacoes ?? "Nenhuma"}",
                    DataHoraPrincipal = encomenda.RecebidoEm,
                    DataHoraAtualizacao = encomenda.UpdatedAt, // Assuming Encomenda has UpdatedAt
                    PrioridadeOrdenacao = isPendente ? 0 : 1,
                    UrlDestino = $"/app/encomendas/{encomenda.Id}",
                    Icone = isPendente ? "icon-encomenda-pendente" : "icon-encomenda",
                    Status = encomenda.Status.ToString(), // Enum to string
                    Categoria = "Portaria",
                    DetalhesAdicionais = new { encomenda.CodigoRastreio, encomenda.Remetente, encomenda.Observacoes }
                });
            }
            return feedItems;
        }

        private async Task<IEnumerable<FeedItemDto>> FetchLembretesBoletoAsync(Guid condominioId, Guid usuarioId, CancellationToken ct)
        {
            var feedItems = new List<FeedItemDto>();
            var usuario = await _usuarioRepository.GetByIdAsync(usuarioId, ct);

            if (usuario == null) // Usuario.UnidadeId is Guid (non-nullable)
            {
                return feedItems;
            }
            var unidadeId = usuario.UnidadeId; // Direct access

            // Fetch "Pendente" cobrancas for the whole condominio.
            // "Pendente" status in ListarCobrancasAsync covers: Gerado, Registrado, Enviado, Vencido
            var todasCobrancasPendentesCondominio = await _financeiroService.ListarCobrancasAsync(condominioId, "Pendente");

            // Filter for the current user's unidade
            var cobrancasUsuario = todasCobrancasPendentesCondominio.Where(c => c.UnidadeId == unidadeId);

            var hoje = DateTime.UtcNow.Date;
            var diasAntecedenciaLembrete = 3; // Make this configurable if needed

            foreach (var cobranca in cobrancasUsuario)
            {
                // Check if BoletoStatus enum can be parsed from cobranca.StatusCobranca for more robust check
                bool isPagoOuCancelado = cobranca.StatusCobranca.Equals(Core.Enums.BoletoStatus.Pago.ToString(), StringComparison.OrdinalIgnoreCase) ||
                                        cobranca.StatusCobranca.Equals(Core.Enums.BoletoStatus.Cancelado.ToString(), StringComparison.OrdinalIgnoreCase);

                if (isPagoOuCancelado) continue; // Skip paid or canceled boletos

                bool venceEmBreve = cobranca.DataVencimento.Date >= hoje &&
                                    cobranca.DataVencimento.Date <= hoje.AddDays(diasAntecedenciaLembrete);

                // Also include recently overdue items if they should be prioritized in feed
                bool recentermenteVencido = cobranca.DataVencimento.Date < hoje &&
                                           cobranca.DataVencimento.Date >= hoje.AddDays(-7); // Example: vencido nos últimos 7 dias

                int prioridade = 1; // Normal
                string titulo = $"Boleto: {cobranca.NomeSacado ?? "Sua unidade"}";
                string resumo = $"Valor: {cobranca.Valor:C}, Vencimento: {cobranca.DataVencimento:dd/MM/yyyy}.";

                if (venceEmBreve)
                {
                    prioridade = 0; // Top-fixed
                    titulo = $"Lembrete! Boleto vence em breve: {cobranca.NomeSacado ?? "Sua unidade"}";
                    resumo = $"Valor: {cobranca.Valor:C}. Vence em {cobranca.DataVencimento:dd/MM/yyyy}. Não perca o prazo!";
                }
                else if (recentermenteVencido)
                {
                    prioridade = 0; // Also prioritize recently overdue
                    titulo = $"Atenção! Boleto vencido: {cobranca.NomeSacado ?? "Sua unidade"}";
                    resumo = $"Valor: {cobranca.Valor:C}. Venceu em {cobranca.DataVencimento:dd/MM/yyyy}. Regularize!";
                }


                feedItems.Add(new FeedItemDto
                {
                    ItemType = "BoletoLembrete",
                    Id = cobranca.Id, // Original Boleto ID
                    Titulo = titulo,
                    Resumo = resumo,
                    DataHoraPrincipal = cobranca.DataVencimento,
                    DataHoraAtualizacao = cobranca.DataVencimento, // Assuming no specific update timestamp for CobrancaDto apart from DataVencimento
                    PrioridadeOrdenacao = prioridade,
                    UrlDestino = cobranca.LinkSegundaVia ?? $"/app/financeiro/cobrancas/{cobranca.Id}",
                    Icone = prioridade == 0 ? "icon-boleto-urgente" : "icon-boleto",
                    Status = cobranca.StatusCobranca,
                    Categoria = "Financeiro",
                    DetalhesAdicionais = new { cobranca.Valor, cobranca.NomeSacado }
                });
            }
            return feedItems;
        }

        private async Task<IEnumerable<FeedItemDto>> FetchDocumentosRecentesAsync(Guid condominioId, Guid usuarioId, CancellationToken ct)
        {
            // Fetch all documents for the condominio, ordered by most recent by default from the service
            var documentos = await _documentoService.ListarDocumentosAsync(condominioId, null, ct);
            var feedItems = new List<FeedItemDto>();

            // Optional: Limit the number of documents shown in the feed, e.g., top 10 or 20 most recent.
            // For now, taking all returned by the service.
            // var documentosParaFeed = documentos.Take(10);

            foreach (var doc in documentos) // Use 'documentos' or 'documentosParaFeed'
            {
                feedItems.Add(new FeedItemDto
                {
                    ItemType = "Documento",
                    Id = doc.Id,
                    Titulo = doc.TituloDescritivo,
                    Resumo = $"Novo documento '{doc.NomeArquivoOriginal}' na categoria '{doc.Categoria}'.",
                    DataHoraPrincipal = doc.DataUpload,
                    DataHoraAtualizacao = doc.DataUpload, // Assuming DataUpload is the most relevant update timestamp
                    PrioridadeOrdenacao = 1, // Normal priority
                    UrlDestino = doc.Url, // This should be the download/view link
                    Icone = "icon-documento",
                    Status = null, // Documents don't typically have a feed-relevant status like "Pendente"
                    Categoria = doc.Categoria,
                    DetalhesAdicionais = new { doc.NomeArquivoOriginal, doc.TipoArquivo, doc.TamanhoArquivoBytes }
                });
            }
            return feedItems;
        }

        private async Task<IEnumerable<FeedItemDto>> FetchReservasConfirmadasAsync(Guid condominioId, Guid usuarioId, CancellationToken ct)
        {
            var feedItems = new List<FeedItemDto>();
            var usuario = await _usuarioRepository.GetByIdAsync(usuarioId, ct);

            if (usuario == null) // Usuario.UnidadeId is Guid (non-nullable)
            {
                return feedItems;
            }
            var unidadeId = usuario.UnidadeId; // Direct access

            // Verify Unidade belongs to Condominio (important if Reserva doesn't store CondominioId)
            var unidade = await _unidadeRepository.GetByIdAsync(unidadeId, ct);
            if (unidade == null || unidade.CondominioId != condominioId)
            {
                return feedItems;
            }

            var hoje = DateTime.UtcNow;
            // Fetch recent confirmed/approved reservations for the user's unidade
            var reservas = await _reservaRepository.Query() // Corrected to use _reservaRepository
                .Where(r => r.UnidadeId == unidadeId &&
                             r.Status == Core.Enums.ReservaStatus.Confirmada && // Corrected: Only use Confirmada
                             r.Inicio >= hoje.AddDays(-7) && // Example: happening in the last 7 days
                             r.Inicio <= hoje.AddDays(30))  // Example: or in the next 30 days
                .OrderBy(r => r.Inicio) // Show upcoming ones first, or recently past
                .ToListAsync(ct);

            foreach (var reserva in reservas)
            {
                feedItems.Add(new FeedItemDto
                {
                    ItemType = "Reserva",
                    Id = reserva.Id,
                    Titulo = $"Reserva Confirmada: {reserva.Area}",
                    Resumo = $"Sua reserva para {reserva.Area} está confirmada para {reserva.Inicio:dd/MM/yyyy HH:mm} até {reserva.Fim:HH:mm}.",
                    DataHoraPrincipal = reserva.Inicio,
                    DataHoraAtualizacao = reserva.UpdatedAt,
                    PrioridadeOrdenacao = 1, // Normal priority
                    UrlDestino = $"/app/reservas/{reserva.Id}", // Or a link to a calendar view
                    Icone = "icon-reserva-confirmada",
                    Status = reserva.Status.ToString(),
                    Categoria = "Reservas",
                    DetalhesAdicionais = new { reserva.Area, reserva.Fim, reserva.Taxa }
                });
            }
            return feedItems;
        }

        private async Task<IEnumerable<FeedItemDto>> FetchOrdensServicoAsync(Guid condominioId, Guid usuarioId, CancellationToken ct)
        {
            var feedItems = new List<FeedItemDto>();
            var ordens = await _ordemServicoService.ListarOSPorUsuarioAsync(condominioId, usuarioId, null, ct);

            foreach (var os in ordens)
            {
                feedItems.Add(new FeedItemDto
                {
                    ItemType = "OrdemServico",
                    Id = os.Id,
                    Titulo = os.Descricao ?? "Ordem de Serviço",
                    Resumo = $"Status: {os.Status}",
                    DataHoraPrincipal = os.CriadoEm,
                    DataHoraAtualizacao = os.UpdatedAt,
                    PrioridadeOrdenacao = 1,
                    UrlDestino = $"/app/ordens-servico/{os.Id}",
                    Icone = "icon-ordem-servico",
                    Status = os.Status.ToString(),
                    Categoria = "Servicos",
                    DetalhesAdicionais = null
                });
            }

            return feedItems;
        }

        // Helper for truncating strings, can be moved to a utility class
        private static string? TruncateString(string? str, int maxLength)
        {
            if (string.IsNullOrEmpty(str))
                return str;
            return str.Length <= maxLength ? str : str.Substring(0, maxLength) + "...";
        }
    }
}
