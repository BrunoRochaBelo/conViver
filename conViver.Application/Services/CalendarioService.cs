using conViver.Core.Enums;
using conViver.Core.Entities;
using conViver.Core.Interfaces;
using conViver.Core.DTOs;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Globalization;

namespace conViver.Application.Services;

public class CalendarioService // Renomeado de ReservaService
{
    private readonly IRepository<CalendarioItem> _calendarioItemRepository; // Renomeado de _reservaRepository
    private readonly IRepository<EspacoComum> _espacoComumRepository;
    private readonly IRepository<Unidade> _unidadeRepository;
    private readonly IRepository<Usuario> _usuarioRepository;
    private readonly INotificacaoService _notificacaoService;


    public CalendarioService( // Renomeado de ReservaService
        IRepository<CalendarioItem> calendarioItemRepository, // Renomeado de reservaRepository
        IRepository<EspacoComum> espacoComumRepository,
        IRepository<Unidade> unidadeRepository,
        IRepository<Usuario> usuarioRepository,
        INotificacaoService notificacaoService)
    {
        _calendarioItemRepository = calendarioItemRepository;
        _espacoComumRepository = espacoComumRepository;
        _unidadeRepository = unidadeRepository;
        _usuarioRepository = usuarioRepository;
        _notificacaoService = notificacaoService;
    }

    public async Task<IEnumerable<EspacoComumDto>> ListarEspacosComunsAsync(
        Guid condominioId,
        CancellationToken ct = default)
    {
        return await _espacoComumRepository.Query()
            .Where(e => e.CondominioId == condominioId)
            .Select(e => new EspacoComumDto // EspacoComumDto mantido como está
            {
                Id = e.Id,
                Nome = e.Nome,
                Descricao = e.Descricao,
                Capacidade = e.Capacidade,
                TaxaReserva = e.TaxaReserva,
                HorarioFuncionamentoInicio = e.HorarioFuncionamentoInicio,
                HorarioFuncionamentoFim = e.HorarioFuncionamentoFim,
                TempoMinimoReservaMinutos = e.TempoMinimoReservaMinutos,
                TempoMaximoReservaMinutos = e.TempoMaximoReservaMinutos,
                AntecedenciaMaximaReservaDias = e.AntecedenciaMaximaReservaDias,
                AntecedenciaMinimaCancelamentoHoras = e.AntecedenciaMinimaCancelamentoHoras,
                LimiteReservasPorUnidadeMes = e.LimiteReservasPorUnidadeMes,
                RequerAprovacaoSindico = e.RequerAprovacaoSindico,
                ExibirNoMural = e.ExibirNoMural,
                DiasIndisponiveis = e.DiasIndisponiveis,
                PermiteVisualizacaoPublicaDetalhes = e.PermiteVisualizacaoPublicaDetalhes
            })
            .ToListAsync(ct);
    }

    public async Task<IEnumerable<AgendaCalendarioItemDto>> GetAgendaAsync( // Retorna AgendaCalendarioItemDto
        Guid condominioId,
        DateTime mesAno,
        Guid usuarioLogadoId,
        Guid? espacoComumIdFiltro,
        string? statusFiltro,
        Guid? unidadeIdFiltro,
        bool isSindico,
        string? tipoItemFiltro = null, // Novo filtro para tipo de item
        CancellationToken ct = default)
    {
        var inicioMes = new DateTime(mesAno.Year, mesAno.Month, 1);
        var fimMes = inicioMes.AddMonths(1).AddMilliseconds(-1);

        var query = _calendarioItemRepository.Query() // Usa _calendarioItemRepository
            .Include(ci => ci.EspacoComum)
            .Include(ci => ci.Unidade)
            .Where(ci =>
                (ci.EspacoComumId == null || (ci.EspacoComum != null && ci.EspacoComum.CondominioId == condominioId)) && // Lida com itens sem EspacoComum
                ci.CondominioId == condominioId && // Garante que itens sem espaço comum são do condomínio
                ci.Inicio <= fimMes &&
                ci.Fim >= inicioMes &&
                ci.Status != ReservaStatus.Recusada && // Mantendo ReservaStatus por enquanto
                ci.Status != ReservaStatus.CanceladaPeloUsuario &&
                ci.Status != ReservaStatus.CanceladaPeloSindico);

        if (espacoComumIdFiltro.HasValue)
        {
            query = query.Where(ci => ci.EspacoComumId == espacoComumIdFiltro.Value);
        }
        else if (tipoItemFiltro != null && tipoItemFiltro != "Reserva") // Se não filtra espaço, mas filtra por tipo que não seja reserva
        {
            // Para eventos gerais não vinculados a um espaço, não filtramos por EspacoComumId
            // A lógica de tipo de item será adicionada aqui se CalendarioItem tiver um campo Tipo
        }


        if (!string.IsNullOrEmpty(statusFiltro) && Enum.TryParse<ReservaStatus>(statusFiltro, true, out var status))
        {
            query = query.Where(ci => ci.Status == status);
        }

        if (isSindico && unidadeIdFiltro.HasValue)
        {
            query = query.Where(ci => ci.UnidadeId == unidadeIdFiltro.Value);
        }

        // TODO: Implementar filtro por tipoItemFiltro se a entidade CalendarioItem tiver um campo de tipo
        // Ex: if (!string.IsNullOrEmpty(tipoItemFiltro)) query = query.Where(ci => ci.Tipo == tipoItemFiltro);


        var itensNoMes = await query.ToListAsync(ct);

        return itensNoMes.Select(ci => new AgendaCalendarioItemDto // Retorna AgendaCalendarioItemDto
        {
            Id = ci.Id,
            EspacoComumId = ci.EspacoComumId ?? Guid.Empty,
            NomeEspacoComum = ci.EspacoComum?.Nome ?? ci.TituloParaMural ?? "Evento Geral", // Generaliza
            Inicio = ci.Inicio,
            Fim = ci.Fim,
            Status = ci.Status.ToString(),
            UnidadeId = ci.UnidadeId,
            NomeUnidade = ci.Unidade?.Identificacao,
            TituloItem = ci.TituloParaMural ?? $"{ci.EspacoComum?.Nome ?? "Evento"} - {(ci.Unidade?.Identificacao ?? $"Usuário {ci.UsuarioId.ToString()[..4]}")}",
            PertenceAoUsuarioLogado = ci.UsuarioId == usuarioLogadoId,
            PermiteVisualizacaoPublicaDetalhes = ci.EspacoComum?.PermiteVisualizacaoPublicaDetalhes ?? true, // Default para true para eventos gerais
            TipoItem = ci.EspacoComumId.HasValue ? "Reserva" : "Evento", // Exemplo simples de diferenciação
            // CorDoEvento = ... lógica para cor
        });
    }

    public async Task<CalendarioItemDto?> SolicitarAsync( // Retorna CalendarioItemDto, recebe CalendarioItemInputDto
        Guid condominioId,
        Guid usuarioId,
        CalendarioItemInputDto dto, // Recebe CalendarioItemInputDto
        CancellationToken ct = default)
    {
        // Validações para EspacoComum (se for uma reserva de espaço)
        EspacoComum? espaco = null;
        if (dto.EspacoComumId != Guid.Empty && dto.EspacoComumId != null) {
            espaco = await _espacoComumRepository.GetByIdAsync(dto.EspacoComumId, ct);
            if (espaco == null || espaco.CondominioId != condominioId)
                throw new ArgumentException("Espaço comum inválido ou não pertence ao condomínio.");

            if (!string.IsNullOrWhiteSpace(espaco.DiasIndisponiveis))
            {
                var diasIndisponiveisList = espaco.DiasIndisponiveis.Split(',')
                                               .Select(d => d.Trim().ToLowerInvariant()).ToList();
                var diaDaSemanaReserva = dto.Inicio.ToString("dddd", new CultureInfo("pt-BR")).ToLowerInvariant();
                var dataReservaStr = dto.Inicio.ToString("yyyy-MM-dd");

                if (diasIndisponiveisList.Contains(diaDaSemanaReserva) || diasIndisponiveisList.Contains(dataReservaStr))
                {
                    throw new InvalidOperationException($"O espaço {espaco.Nome} não está disponível no dia selecionado.");
                }
            }
             if (TimeSpan.TryParse(espaco.HorarioFuncionamentoInicio, out var iniFunc) &&
                TimeSpan.TryParse(espaco.HorarioFuncionamentoFim, out var fimFunc))
            {
                var inicioDay = dto.Inicio.TimeOfDay;
                var fimDay = dto.Fim.TimeOfDay;
                if (fimDay == TimeSpan.Zero) fimDay = TimeSpan.FromHours(24);

                if (inicioDay < iniFunc || fimDay > fimFunc || inicioDay >= fimFunc)
                    throw new InvalidOperationException($"Item fora do horário de funcionamento do espaço ({espaco.HorarioFuncionamentoInicio}–{espaco.HorarioFuncionamentoFim}).");
            }

            var duracao = (dto.Fim - dto.Inicio).TotalMinutes;
            if (espaco.TempoMinimoReservaMinutos.HasValue && duracao < espaco.TempoMinimoReservaMinutos.Value)
                throw new InvalidOperationException($"Duração mínima de {espaco.TempoMinimoReservaMinutos.Value} minutos.");
            if (espaco.TempoMaximoReservaMinutos.HasValue && duracao > espaco.TempoMaximoReservaMinutos.Value)
                throw new InvalidOperationException($"Duração máxima de {espaco.TempoMaximoReservaMinutos.Value} minutos.");

            if (espaco.AntecedenciaMaximaReservaDias.HasValue && dto.Inicio.Date > DateTime.UtcNow.Date.AddDays(espaco.AntecedenciaMaximaReservaDias.Value))
                throw new InvalidOperationException($"Não é possível agendar com mais de {espaco.AntecedenciaMaximaReservaDias.Value} dias de antecedência.");
        }

        var usuario = await _usuarioRepository.GetByIdAsync(usuarioId, ct);
        if (usuario == null)
            throw new ArgumentException("Usuário solicitante não encontrado.");

        Guid unidadeParaItem;
        if (dto.UnidadeId.HasValue && dto.UnidadeId.Value != Guid.Empty)
        {
            var unid = await _unidadeRepository.GetByIdAsync(dto.UnidadeId.Value, ct);
            if (unid == null || unid.CondominioId != condominioId)
                throw new ArgumentException("Unidade inválida ou fora do condomínio.");
            unidadeParaItem = unid.Id;
        }
        else
        {
            unidadeParaItem = usuario.UnidadeId; // Default para unidade do usuário
        }

        if (dto.Fim <= dto.Inicio)
            throw new ArgumentException("Data/hora de término deve ser posterior ao início.");
        if (dto.Inicio < DateTime.UtcNow.AddMinutes(-5)) // Pequena margem para processamento
            throw new InvalidOperationException("Não é possível criar item em data/hora passada.");


        if (espaco != null && espaco.LimiteReservasPorUnidadeMes.HasValue && espaco.LimiteReservasPorUnidadeMes.Value > 0)
        {
            var inicioDoMes = new DateTime(dto.Inicio.Year, dto.Inicio.Month, 1);
            var fimDoMes = inicioDoMes.AddMonths(1).AddMilliseconds(-1);
            var qtd = await _calendarioItemRepository.Query()
                .CountAsync(ci => ci.EspacoComumId == dto.EspacoComumId && ci.UnidadeId == unidadeParaItem &&
                                 ci.Inicio >= inicioDoMes && ci.Inicio <= fimDoMes &&
                                 (ci.Status == ReservaStatus.Confirmada || ci.Status == ReservaStatus.Pendente), ct);
            if (qtd >= espaco.LimiteReservasPorUnidadeMes.Value)
                throw new InvalidOperationException($"Limite de {espaco.LimiteReservasPorUnidadeMes.Value} agendamentos/mês para este espaço/unidade atingido.");
        }

        if(dto.EspacoComumId != null && dto.EspacoComumId != Guid.Empty) // Só checa conflito se for um espaço comum
        {
            var conflito = await _calendarioItemRepository.Query()
                .AnyAsync(ci => ci.EspacoComumId == dto.EspacoComumId &&
                               ci.Status != ReservaStatus.Recusada &&
                               ci.Status != ReservaStatus.CanceladaPeloUsuario &&
                               ci.Status != ReservaStatus.CanceladaPeloSindico &&
                               dto.Inicio < ci.Fim && ci.Inicio < dto.Fim, ct);
            if (conflito)
                throw new InvalidOperationException("Conflito de horário com outro item agendado para este espaço.");
        }


        var calendarioItem = new CalendarioItem // Renomeado de reserva
        {
            Id = Guid.NewGuid(),
            CondominioId = condominioId,
            UnidadeId = unidadeParaItem,
            UsuarioId = usuarioId,
            EspacoComumId = dto.EspacoComumId == Guid.Empty ? null : dto.EspacoComumId, // Permite nulo
            Inicio = dto.Inicio,
            Fim = dto.Fim,
            Observacoes = dto.Observacoes,
            Status = (espaco?.RequerAprovacaoSindico ?? false) ? ReservaStatus.Pendente : ReservaStatus.Confirmada, // Mantém ReservaStatus
            Taxa = espaco?.TaxaReserva,
            TituloParaMural = dto.TituloParaMural,
            TipoItem = dto.TipoItem ?? "Reserva", // Default para "Reserva" se não especificado
            NotificadoLembrete24h = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // Validação de Permissão para criar tipos diferentes de "Reserva"
        if (calendarioItem.TipoItem != "Reserva")
        {
            // Para buscar o perfil, precisamos do IRepository<Usuario> ou de um método no IUsuarioService
            // Temporariamente, vamos assumir que o objeto 'usuario' já tem a informação de perfil
            // Idealmente, o objeto 'usuario' carregado no início do método teria essa informação.
            // Se 'usuario.Perfil' não existir, esta lógica precisará ser ajustada para buscar o perfil.
            bool isSindicoOuAdmin = usuario.Perfis?.Any(p => p == Core.Enums.PerfilUsuario.Sindico || p == Core.Enums.PerfilUsuario.Administrador) ?? false;
            if (!isSindicoOuAdmin)
            {
                throw new UnauthorizedAccessException($"Usuário não tem permissão para criar um item do tipo '{calendarioItem.TipoItem}'.");
            }
        }

        // Validações de espaço só se aplicam se for uma Reserva e tiver EspacoComumId
        if (calendarioItem.TipoItem == "Reserva" && calendarioItem.EspacoComumId.HasValue && espaco != null)
        {
            if (!string.IsNullOrWhiteSpace(espaco.DiasIndisponiveis))
            {
                var diasIndisponiveisList = espaco.DiasIndisponiveis.Split(',')
                                               .Select(d => d.Trim().ToLowerInvariant()).ToList();
                var diaDaSemanaReserva = dto.Inicio.ToString("dddd", new CultureInfo("pt-BR")).ToLowerInvariant();
                var dataReservaStr = dto.Inicio.ToString("yyyy-MM-dd");

                if (diasIndisponiveisList.Contains(diaDaSemanaReserva) || diasIndisponiveisList.Contains(dataReservaStr))
                {
                    throw new InvalidOperationException($"O espaço {espaco.Nome} não está disponível no dia selecionado.");
                }
            }
            if (TimeSpan.TryParse(espaco.HorarioFuncionamentoInicio, out var iniFunc) &&
                TimeSpan.TryParse(espaco.HorarioFuncionamentoFim, out var fimFunc))
            {
                var inicioDay = dto.Inicio.TimeOfDay;
                var fimDay = dto.Fim.TimeOfDay;
                if (fimDay == TimeSpan.Zero) fimDay = TimeSpan.FromHours(24);

                if (inicioDay < iniFunc || fimDay > fimFunc || inicioDay >= fimFunc)
                    throw new InvalidOperationException($"Item fora do horário de funcionamento do espaço ({espaco.HorarioFuncionamentoInicio}–{espaco.HorarioFuncionamentoFim}).");
            }

            var duracao = (dto.Fim - dto.Inicio).TotalMinutes;
            if (espaco.TempoMinimoReservaMinutos.HasValue && duracao < espaco.TempoMinimoReservaMinutos.Value)
                throw new InvalidOperationException($"Duração mínima de {espaco.TempoMinimoReservaMinutos.Value} minutos.");
            if (espaco.TempoMaximoReservaMinutos.HasValue && duracao > espaco.TempoMaximoReservaMinutos.Value)
                throw new InvalidOperationException($"Duração máxima de {espaco.TempoMaximoReservaMinutos.Value} minutos.");

            if (espaco.AntecedenciaMaximaReservaDias.HasValue && dto.Inicio.Date > DateTime.UtcNow.Date.AddDays(espaco.AntecedenciaMaximaReservaDias.Value))
                throw new InvalidOperationException($"Não é possível agendar com mais de {espaco.AntecedenciaMaximaReservaDias.Value} dias de antecedência.");

            if (espaco.LimiteReservasPorUnidadeMes.HasValue && espaco.LimiteReservasPorUnidadeMes.Value > 0)
            {
                var inicioDoMes = new DateTime(dto.Inicio.Year, dto.Inicio.Month, 1);
                var fimDoMes = inicioDoMes.AddMonths(1).AddMilliseconds(-1);
                var qtd = await _calendarioItemRepository.Query()
                    .CountAsync(ci => ci.EspacoComumId == dto.EspacoComumId && ci.UnidadeId == unidadeParaItem &&
                                     ci.Inicio >= inicioDoMes && ci.Inicio <= fimDoMes &&
                                     (ci.Status == ReservaStatus.Confirmada || ci.Status == ReservaStatus.Pendente), ct);
                if (qtd >= espaco.LimiteReservasPorUnidadeMes.Value)
                    throw new InvalidOperationException($"Limite de {espaco.LimiteReservasPorUnidadeMes.Value} agendamentos/mês para este espaço/unidade atingido.");
            }

            var conflito = await _calendarioItemRepository.Query()
                .AnyAsync(ci => ci.EspacoComumId == dto.EspacoComumId &&
                               ci.Status != ReservaStatus.Recusada &&
                               ci.Status != ReservaStatus.CanceladaPeloUsuario &&
                               ci.Status != ReservaStatus.CanceladaPeloSindico &&
                               dto.Inicio < ci.Fim && ci.Inicio < dto.Fim, ct);
            if (conflito)
                throw new InvalidOperationException("Conflito de horário com outro item agendado para este espaço.");
        }


        await _calendarioItemRepository.AddAsync(calendarioItem, ct);
        await _calendarioItemRepository.SaveChangesAsync(ct);

        var nomeDoItem = calendarioItem.TituloParaMural ?? espaco?.Nome ?? "Novo item no calendário";
        var dataHora = calendarioItem.Inicio.ToString("dd/MM/yyyy 'às' HH:mm");
        await _notificacaoService.SendToUserAsync(usuarioId, $"Seu agendamento para {nomeDoItem} em {dataHora} foi recebido e está {calendarioItem.Status.ToString().ToLower()}.", ct);

        return await GetByIdAsync(calendarioItem.Id, condominioId, usuarioId, false, ct); // Retorna CalendarioItemDto
    }

    public async Task<CalendarioItemDto?> AtualizarStatusAsync( // Retorna CalendarioItemDto, recebe CalendarioItemStatusUpdateDto
        Guid itemId, // Renomeado de reservaId
        Guid condominioId,
        Guid sindicoUserId,
        CalendarioItemStatusUpdateDto dto, // Recebe CalendarioItemStatusUpdateDto
        CancellationToken ct = default)
    {
        var item = await _calendarioItemRepository.Query() // Usa _calendarioItemRepository
            .Include(ci => ci.EspacoComum)
            .Include(ci => ci.Solicitante)
            .FirstOrDefaultAsync(ci => ci.Id == itemId && ci.CondominioId == condominioId, ct);
        if (item == null)
            throw new KeyNotFoundException("Item do calendário não encontrado.");

        if (!Enum.TryParse<ReservaStatus>(dto.Status, true, out var novoStatus)) // Mantém ReservaStatus
            throw new ArgumentException("Status inválido.");

        if ((item.Status == ReservaStatus.CanceladaPeloUsuario || item.Status == ReservaStatus.CanceladaPeloSindico) && novoStatus != item.Status)
            throw new InvalidOperationException("Não é possível alterar status de item já cancelado.");

        var statusAnterior = item.Status;
        item.Status = novoStatus;
        item.JustificativaAprovacaoRecusa = dto.Justificativa;
        item.AprovadorId = sindicoUserId;
        item.UpdatedAt = DateTime.UtcNow;

        await _calendarioItemRepository.UpdateAsync(item, ct);
        await _calendarioItemRepository.SaveChangesAsync(ct);

        if (statusAnterior != novoStatus && item.Solicitante != null)
        {
            var nomeDoItem = item.TituloParaMural ?? item.EspacoComum?.Nome ?? "Seu item agendado";
            var dataHora = item.Inicio.ToString("dd/MM/yyyy 'às' HH:mm");
            var msg = $"O status do seu item '{nomeDoItem}' em {dataHora} foi atualizado para: {novoStatus}.";
            if (!string.IsNullOrEmpty(dto.Justificativa)) msg += $" Justificativa: {dto.Justificativa}";
            await _notificacaoService.SendToUserAsync(item.UsuarioId, msg, ct);
        }

        return await GetByIdAsync(itemId, condominioId, sindicoUserId, true, ct); // Retorna CalendarioItemDto
    }

    public async Task<CalendarioItemDto?> GetByIdAsync( // Retorna CalendarioItemDto
        Guid itemId, // Renomeado de reservaId
        Guid condominioId,
        Guid usuarioId,
        bool isSindico,
        CancellationToken ct = default)
    {
        var item = await _calendarioItemRepository.Query() // Usa _calendarioItemRepository
            .Include(ci => ci.EspacoComum)
            .Include(ci => ci.Unidade)
            .FirstOrDefaultAsync(ci => ci.Id == itemId && ci.CondominioId == condominioId, ct);

        if (item == null) return null;

        bool podeVerDetalhes = isSindico || item.UsuarioId == usuarioId || (item.EspacoComum?.PermiteVisualizacaoPublicaDetalhes ?? true);
        if (!podeVerDetalhes)
        {
            // Se não pode ver detalhes, talvez retornar uma versão limitada ou null
            // Por simplicidade, retornando null se não tiver permissão básica.
            // A lógica de "o que mostrar" para não donos/não síndicos pode ser mais granular.
             return null;
        }

        var solicitante = await _usuarioRepository.GetByIdAsync(item.UsuarioId, ct);
        var aprovador = item.AprovadorId.HasValue ? await _usuarioRepository.GetByIdAsync(item.AprovadorId.Value, ct) : null;

        return new CalendarioItemDto // Retorna CalendarioItemDto
        {
            Id = item.Id,
            CondominioId = item.CondominioId,
            UnidadeId = item.UnidadeId,
            NomeUnidade = item.Unidade?.Identificacao,
            UsuarioId = item.UsuarioId,
            NomeUsuarioSolicitante = solicitante?.Nome,
            EspacoComumId = item.EspacoComumId ?? Guid.Empty,
            NomeEspacoComum = item.EspacoComum?.Nome,
            Inicio = item.Inicio,
            Fim = item.Fim,
            Status = item.Status.ToString(), // Mantém ReservaStatus
            DataSolicitacao = item.CreatedAt,
            TaxaCobrada = item.Taxa,
            Observacoes = item.Observacoes,
            TituloParaMural = item.TituloParaMural,
            AprovadorId = item.AprovadorId,
            NomeAprovador = aprovador?.Nome,
            JustificativaAprovacaoRecusa = item.JustificativaAprovacaoRecusa,
            UpdatedAt = item.UpdatedAt
            // TODO: Adicionar TipoItem se existir
        };
    }

    public async Task<bool> CancelarAsync(
        Guid itemId, // Renomeado de reservaId
        Guid condominioId,
        Guid usuarioId,
        bool isSindico,
        CancellationToken ct = default)
    {
        var item = await _calendarioItemRepository.Query() // Usa _calendarioItemRepository
            .Include(ci => ci.EspacoComum)
            .Include(ci => ci.Solicitante)
            .FirstOrDefaultAsync(ci => ci.Id == itemId && ci.CondominioId == condominioId, ct);
        if (item == null)
            throw new KeyNotFoundException("Item do calendário não encontrado.");

        if (!isSindico && item.UsuarioId != usuarioId)
            throw new UnauthorizedAccessException("Usuário não autorizado a cancelar este item.");

        if (!isSindico && item.EspacoComumId.HasValue && item.EspacoComum?.AntecedenciaMinimaCancelamentoHoras.HasValue == true)
        {
            var horas = item.EspacoComum.AntecedenciaMinimaCancelamentoHoras.Value;
            if (DateTime.UtcNow.AddHours(horas) > item.Inicio)
                throw new InvalidOperationException($"Cancelamento exige ao menos {horas}h de antecedência para este espaço.");
        }

        item.Status = isSindico ? ReservaStatus.CanceladaPeloSindico : ReservaStatus.CanceladaPeloUsuario; // Mantém ReservaStatus
        item.UpdatedAt = DateTime.UtcNow;

        await _calendarioItemRepository.UpdateAsync(item, ct);
        await _calendarioItemRepository.SaveChangesAsync(ct);

        var nomeDoItem = item.TituloParaMural ?? item.EspacoComum?.Nome ?? "Seu item agendado";
        var dataHora = item.Inicio.ToString("dd/MM/yyyy 'às' HH:mm");

        if (isSindico && item.UsuarioId != usuarioId && item.Solicitante != null)
        {
            await _notificacaoService.SendToUserAsync(item.UsuarioId, $"Seu item '{nomeDoItem}' em {dataHora} foi cancelado pelo síndico.", ct);
        }
        // else if (!isSindico) { /* Notificar síndico se usuário cancelou */ }

        return true;
    }

    public async Task<CalendarioItemDto?> EditarCalendarioItemAsync( // Renomeado de EditarReservaAsync, retorna CalendarioItemDto, recebe CalendarioItemInputDto
        Guid itemId, // Renomeado de reservaId
        Guid condominioId,
        Guid sindicoUserId, // Assumindo que apenas síndico edita diretamente
        CalendarioItemInputDto dto, // Recebe CalendarioItemInputDto
        CancellationToken ct = default)
    {
        var item = await _calendarioItemRepository.Query() // Usa _calendarioItemRepository
            .Include(ci => ci.EspacoComum)
            .Include(ci => ci.Solicitante)
            .FirstOrDefaultAsync(ci => ci.Id == itemId && ci.CondominioId == condominioId, ct);
        if (item == null)
            throw new KeyNotFoundException("Item do calendário não encontrado.");

        // TODO: Adicionar validações de regras (conflito, horário, etc.) ao editar, similar ao SolicitarAsync.
        // Essas validações devem considerar se o item é um evento geral ou uma reserva de espaço.

        bool dataAlterada = item.Inicio != dto.Inicio || item.Fim != dto.Fim;

        item.Inicio = dto.Inicio;
        item.Fim = dto.Fim;
        item.Observacoes = dto.Observacoes;
        item.TituloParaMural = dto.TituloParaMural;
        item.EspacoComumId = dto.EspacoComumId == Guid.Empty ? null : dto.EspacoComumId; // Atualiza EspacoComumId
        // Se dto.UnidadeId for relevante para edição pelo síndico:
        // item.UnidadeId = dto.UnidadeId ?? item.UnidadeId;

        item.UpdatedAt = DateTime.UtcNow;
        item.AprovadorId = sindicoUserId; // Síndico que editou
        if (dataAlterada)
        {
            item.NotificadoLembrete24h = false;
        }
        // TODO: Adicionar atualização de TipoItem se existir

        await _calendarioItemRepository.UpdateAsync(item, ct);
        await _calendarioItemRepository.SaveChangesAsync(ct);

        if (item.Solicitante != null && item.UsuarioId != sindicoUserId)
        {
            var nomeDoItem = item.TituloParaMural ?? item.EspacoComum?.Nome ?? "Seu item agendado";
            var dataHoraNova = item.Inicio.ToString("dd/MM/yyyy 'às' HH:mm");
            await _notificacaoService.SendToUserAsync(item.UsuarioId, $"Seu item '{nomeDoItem}' foi alterado pelo síndico para {dataHoraNova}.", ct);
        }

        return await GetByIdAsync(itemId, condominioId, sindicoUserId, true, ct); // Retorna CalendarioItemDto
    }

    public async Task<PaginatedResultDto<CalendarioItemDto>> ListarTodosItensCalendarioAsync( // Renomeado, retorna PaginatedResultDto<CalendarioItemDto>, recebe CalendarioItemFilterDto
        Guid condominioId,
        CalendarioItemFilterDto filters, // Recebe CalendarioItemFilterDto
        CancellationToken ct = default)
    {
        var query = _calendarioItemRepository.Query() // Usa _calendarioItemRepository
            .Where(ci => ci.CondominioId == condominioId);

        if (filters.EspacoComumId.HasValue)
            query = query.Where(ci => ci.EspacoComumId == filters.EspacoComumId.Value);
        if (filters.UnidadeId.HasValue)
            query = query.Where(ci => ci.UnidadeId == filters.UnidadeId.Value);
        if (!string.IsNullOrEmpty(filters.Status) && Enum.TryParse<ReservaStatus>(filters.Status, true, out var st)) // Mantém ReservaStatus
            query = query.Where(ci => ci.Status == st);
        if (filters.PeriodoInicio.HasValue)
            query = query.Where(ci => ci.Fim >= filters.PeriodoInicio.Value);
        if (filters.PeriodoFim.HasValue)
        {
            var fimDia = filters.PeriodoFim.Value.Date.AddDays(1).AddTicks(-1);
            query = query.Where(ci => ci.Inicio <= fimDia);
        }
        // TODO: Adicionar filtro por filters.TipoItem se existir


        var total = await query.CountAsync(ct);

        var lista = await query
            .Include(ci => ci.EspacoComum)
            .Include(ci => ci.Unidade)
            .OrderByDescending(ci => ci.Inicio)
            .Skip((filters.PageNumber - 1) * filters.PageSize)
            .Take(filters.PageSize)
            .ToListAsync(ct);

        var dtos = new List<CalendarioItemDto>(lista.Count); // Lista de CalendarioItemDto
        foreach (var ci in lista)
        {
            var sol = await _usuarioRepository.GetByIdAsync(ci.UsuarioId, ct);
            var apr = ci.AprovadorId.HasValue ? await _usuarioRepository.GetByIdAsync(ci.AprovadorId.Value, ct) : null;

            dtos.Add(new CalendarioItemDto // Cria CalendarioItemDto
            {
                Id = ci.Id,
                CondominioId = ci.CondominioId,
                UnidadeId = ci.UnidadeId,
                NomeUnidade = ci.Unidade?.Identificacao,
                UsuarioId = ci.UsuarioId,
                NomeUsuarioSolicitante = sol?.Nome,
                EspacoComumId = ci.EspacoComumId ?? Guid.Empty,
                NomeEspacoComum = ci.EspacoComum?.Nome,
                Inicio = ci.Inicio,
                Fim = ci.Fim,
                Status = ci.Status.ToString(),
                DataSolicitacao = ci.CreatedAt,
                TaxaCobrada = ci.Taxa,
                Observacoes = ci.Observacoes,
                TituloParaMural = ci.TituloParaMural,
                AprovadorId = ci.AprovadorId,
                NomeAprovador = apr?.Nome,
                JustificativaAprovacaoRecusa = ci.JustificativaAprovacaoRecusa,
                UpdatedAt = ci.UpdatedAt
                // TODO: Adicionar TipoItem
            });
        }

        return new PaginatedResultDto<CalendarioItemDto>(dtos, total, filters.PageNumber, filters.PageSize); // Retorna PaginatedResultDto<CalendarioItemDto>
    }
    public async Task<PaginatedResultDto<CalendarioItemDto>> ListarItensCalendarioListViewAsync( // Renomeado, retorna PaginatedResultDto<CalendarioItemDto>, recebe CalendarioItemFilterDto
       Guid condominioId,
       Guid usuarioId,
       CalendarioItemFilterDto filters, // Recebe CalendarioItemFilterDto
       bool isSindico,
       CancellationToken ct = default)
    {
        var query = _calendarioItemRepository.Query() // Usa _calendarioItemRepository
            .Where(ci => ci.CondominioId == condominioId);

        if (!isSindico)
        {
            // Usuário normal vê seus itens ou itens públicos (se houver essa lógica para eventos gerais)
            query = query.Where(ci => ci.UsuarioId == usuarioId /* || ci.IsPublico */ );
        }
        else
        {
            if (filters.UnidadeId.HasValue)
            {
                query = query.Where(ci => ci.UnidadeId == filters.UnidadeId.Value);
            }
        }

        if (filters.EspacoComumId.HasValue)
            query = query.Where(ci => ci.EspacoComumId == filters.EspacoComumId.Value);

        if (!string.IsNullOrEmpty(filters.Status) && Enum.TryParse<ReservaStatus>(filters.Status, true, out var st)) // Mantém ReservaStatus
            query = query.Where(ci => ci.Status == st);

        if (filters.PeriodoInicio.HasValue)
            query = query.Where(ci => ci.Fim >= filters.PeriodoInicio.Value);
        if (filters.PeriodoFim.HasValue)
        {
            var fimDia = filters.PeriodoFim.Value.Date.AddDays(1).AddTicks(-1);
            query = query.Where(ci => ci.Inicio <= fimDia);
        }
        // TODO: Adicionar filtro por filters.TipoItem

        var total = await query.CountAsync(ct);

        // Ordenação conforme solicitado pelo usuário (a ser implementada com base em filters.OrderBy)
        // Exemplo: Ordenar por pendentes primeiro, depois por data.
        // Esta ordenação deve ser flexível e vir do DTO de filtros.
        // Para "Minhas Reservas": priorizar pendentes, depois cronológico.
        // if (filters.PrioritizePending) {
        //    query = query.OrderBy(ci => ci.Status == ReservaStatus.Pendente ? 0 : 1)
        //                 .ThenByDescending(ci => ci.Inicio);
        // } else {
        //    query = query.OrderByDescending(ci => ci.Inicio);
        // }
        // Temporariamente, mantendo a ordenação anterior:
        query = query.OrderByDescending(ci => ci.Inicio);


        var lista = await query
            .Include(ci => ci.EspacoComum)
            .Include(ci => ci.Unidade)
            .Skip((filters.PageNumber - 1) * filters.PageSize)
            .Take(filters.PageSize)
            .ToListAsync(ct);

        var dtos = new List<CalendarioItemDto>(); // Lista de CalendarioItemDto
        foreach (var ci in lista)
        {
            var sol = await _usuarioRepository.GetByIdAsync(ci.UsuarioId, ct);
            var apr = ci.AprovadorId.HasValue ? await _usuarioRepository.GetByIdAsync(ci.AprovadorId.Value, ct) : null;
            dtos.Add(new CalendarioItemDto // Cria CalendarioItemDto
            {
                Id = ci.Id,
                CondominioId = ci.CondominioId,
                UnidadeId = ci.UnidadeId,
                NomeUnidade = ci.Unidade?.Identificacao,
                UsuarioId = ci.UsuarioId,
                NomeUsuarioSolicitante = sol?.Nome,
                EspacoComumId = ci.EspacoComumId ?? Guid.Empty,
                NomeEspacoComum = ci.EspacoComum?.Nome,
                Inicio = ci.Inicio,
                Fim = ci.Fim,
                Status = ci.Status.ToString(),
                DataSolicitacao = ci.CreatedAt,
                TaxaCobrada = ci.Taxa,
                Observacoes = ci.Observacoes,
                TituloParaMural = ci.TituloParaMural,
                AprovadorId = ci.AprovadorId,
                NomeAprovador = apr?.Nome,
                JustificativaAprovacaoRecusa = ci.JustificativaAprovacaoRecusa,
                UpdatedAt = ci.UpdatedAt
                // TODO: Adicionar TipoItem
            });
        }
        return new PaginatedResultDto<CalendarioItemDto>(dtos, total, filters.PageNumber, filters.PageSize); // Retorna PaginatedResultDto<CalendarioItemDto>
    }


    public async Task<List<CalendarioItemDto>> ListarMeusItensCalendarioAsync( // Renomeado, retorna List<CalendarioItemDto>
        Guid condominioId,
        Guid usuarioId,
        Guid? espacoComumId = null,
        string? status = null,
        DateTime? periodoInicio = null,
        DateTime? periodoFim = null,
        string? tipoItem = null, // Novo filtro
        CancellationToken ct = default)
    {
        var query = _calendarioItemRepository.Query() // Usa _calendarioItemRepository
            .Where(ci => ci.CondominioId == condominioId && ci.UsuarioId == usuarioId);

        if (espacoComumId.HasValue)
            query = query.Where(ci => ci.EspacoComumId == espacoComumId.Value);

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<ReservaStatus>(status, true, out var st)) // Mantém ReservaStatus
            query = query.Where(ci => ci.Status == st);

        if (periodoInicio.HasValue)
            query = query.Where(ci => ci.Fim >= periodoInicio.Value);
        if (periodoFim.HasValue)
        {
            var fimDia = periodoFim.Value.Date.AddDays(1).AddTicks(-1);
            query = query.Where(ci => ci.Inicio <= fimDia);
        }
        // TODO: Adicionar filtro por tipoItem

        // Ordenação: pendentes primeiro, depois cronológico
        var itens = await query
            .Include(ci => ci.EspacoComum)
            .Include(ci => ci.Unidade)
            .Include(ci => ci.Solicitante)
            .OrderBy(ci => ci.Status == ReservaStatus.Pendente || ci.Status == ReservaStatus.AguardandoAprovacao ? 0 : 1) // Prioriza pendentes/aguardando
            .ThenBy(ci => ci.Inicio) // Depois por data de início
            .ToListAsync(ct);

        var dtos = new List<CalendarioItemDto>(itens.Count); // Lista de CalendarioItemDto
        foreach (var ci in itens)
        {
            var apr = ci.AprovadorId.HasValue ? await _usuarioRepository.GetByIdAsync(ci.AprovadorId.Value, ct) : null;

            dtos.Add(new CalendarioItemDto // Cria CalendarioItemDto
            {
                Id = ci.Id,
                CondominioId = ci.CondominioId,
                UnidadeId = ci.UnidadeId,
                NomeUnidade = ci.Unidade?.Identificacao,
                UsuarioId = ci.UsuarioId,
                NomeUsuarioSolicitante = ci.Solicitante?.Nome,
                EspacoComumId = ci.EspacoComumId ?? Guid.Empty,
                NomeEspacoComum = ci.EspacoComum?.Nome,
                Inicio = ci.Inicio,
                Fim = ci.Fim,
                Status = ci.Status.ToString(),
                DataSolicitacao = ci.CreatedAt,
                TaxaCobrada = ci.Taxa,
                Observacoes = ci.Observacoes,
                TituloParaMural = ci.TituloParaMural,
                AprovadorId = ci.AprovadorId,
                NomeAprovador = apr?.Nome,
                JustificativaAprovacaoRecusa = ci.JustificativaAprovacaoRecusa,
                UpdatedAt = ci.UpdatedAt
                // TODO: Adicionar TipoItem
            });
        }
        return dtos;
    }


    public async Task<PaginatedResultDto<CalendarioMuralDto>> ListarItensCalendarioParaMuralAsync( // Renomeado, retorna PaginatedResultDto<CalendarioMuralDto>
       Guid condominioId,
       int pageNumber,
       int pageSize,
       CancellationToken ct = default)
    {
        var dataReferencia = DateTime.UtcNow.AddHours(-24);

        var query = _calendarioItemRepository.Query() // Usa _calendarioItemRepository
            .Include(ci => ci.EspacoComum)
            .Include(ci => ci.Unidade)
            .Where(ci => ci.CondominioId == condominioId &&
                        (ci.EspacoComum == null || ci.EspacoComum.ExibirNoMural) && // Se for evento sem espaço, ou espaço permite mural
                        ci.Status == ReservaStatus.Confirmada && // Mantém ReservaStatus
                        ci.Fim >= dataReferencia)
            .OrderBy(ci => ci.Inicio);

        var total = await query.CountAsync(ct);
        var itens = await query
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var dtos = itens.Select(ci => new CalendarioMuralDto // Cria CalendarioMuralDto
        {
            IdItemCalendario = ci.Id,
            NomeEspacoComumOuTitulo = ci.EspacoComum?.Nome ?? ci.TituloParaMural ?? "Evento",
            NomeUnidade = ci.Unidade?.Identificacao,
            DataInicio = ci.Inicio.Date,
            HoraInicio = ci.Inicio.ToString("HH:mm"),
            HoraFim = ci.Fim.ToString("HH:mm"),
            TituloCustomizado = ci.TituloParaMural,
            TituloGerado = ci.TituloParaMural ?? $"{ci.EspacoComum?.Nome ?? "Evento"} por {(ci.Unidade?.Identificacao ?? "condômino")}",
            UrlDetalhes = $"/pages/calendario.html?idItem={ci.Id}", // Atualizado
            TipoItem = ci.EspacoComumId.HasValue ? "Reserva" : "Evento" // Exemplo
        }).ToList();

        return new PaginatedResultDto<CalendarioMuralDto>(dtos, total, pageNumber, pageSize); // Retorna PaginatedResultDto<CalendarioMuralDto>
    }


    // --- CRUD de Espaço Comum (mantido como estava, pois EspacoComum é uma entidade separada) ---

    public async Task<EspacoComumDto?> GetEspacoComumByIdAsync(
        Guid espacoId,
        Guid condominioId,
        CancellationToken ct = default)
    {
        var e = await _espacoComumRepository.Query()
            .FirstOrDefaultAsync(x => x.Id == espacoId && x.CondominioId == condominioId, ct);
        if (e == null) return null;

        return new EspacoComumDto
        {
            Id = e.Id,
            Nome = e.Nome,
            Descricao = e.Descricao,
            Capacidade = e.Capacidade,
            TaxaReserva = e.TaxaReserva,
            HorarioFuncionamentoInicio = e.HorarioFuncionamentoInicio,
            HorarioFuncionamentoFim = e.HorarioFuncionamentoFim,
            TempoMinimoReservaMinutos = e.TempoMinimoReservaMinutos,
            TempoMaximoReservaMinutos = e.TempoMaximoReservaMinutos,
            AntecedenciaMaximaReservaDias = e.AntecedenciaMaximaReservaDias,
            AntecedenciaMinimaCancelamentoHoras = e.AntecedenciaMinimaCancelamentoHoras,
            LimiteReservasPorUnidadeMes = e.LimiteReservasPorUnidadeMes,
            RequerAprovacaoSindico = e.RequerAprovacaoSindico,
            ExibirNoMural = e.ExibirNoMural,
            DiasIndisponiveis = e.DiasIndisponiveis,
            PermiteVisualizacaoPublicaDetalhes = e.PermiteVisualizacaoPublicaDetalhes
        };
    }

    public async Task<EspacoComumDto?> CriarEspacoComumAsync(
        Guid condominioId,
        EspacoComumDto dto,
        CancellationToken ct = default)
    {
        var exists = await _espacoComumRepository.Query()
            .AnyAsync(e => e.CondominioId == condominioId && e.Nome.ToLower() == dto.Nome.ToLower(), ct);
        if (exists)
            throw new InvalidOperationException($"Já existe espaço com nome '{dto.Nome}'.");

        var e = new EspacoComum
        {
            Id = Guid.NewGuid(),
            CondominioId = condominioId,
            Nome = dto.Nome,
            Descricao = dto.Descricao,
            Capacidade = dto.Capacidade,
            TaxaReserva = dto.TaxaReserva,
            HorarioFuncionamentoInicio = dto.HorarioFuncionamentoInicio,
            HorarioFuncionamentoFim = dto.HorarioFuncionamentoFim,
            TempoMinimoReservaMinutos = dto.TempoMinimoReservaMinutos,
            TempoMaximoReservaMinutos = dto.TempoMaximoReservaMinutos,
            AntecedenciaMaximaReservaDias = dto.AntecedenciaMaximaReservaDias,
            AntecedenciaMinimaCancelamentoHoras = dto.AntecedenciaMinimaCancelamentoHoras,
            LimiteReservasPorUnidadeMes = dto.LimiteReservasPorUnidadeMes,
            RequerAprovacaoSindico = dto.RequerAprovacaoSindico,
            ExibirNoMural = dto.ExibirNoMural,
            DiasIndisponiveis = dto.DiasIndisponiveis,
            PermiteVisualizacaoPublicaDetalhes = dto.PermiteVisualizacaoPublicaDetalhes,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _espacoComumRepository.AddAsync(e, ct);
        await _espacoComumRepository.SaveChangesAsync(ct);

        dto.Id = e.Id;
        return dto;
    }

    public async Task<EspacoComumDto?> AtualizarEspacoComumAsync(
        Guid espacoId,
        Guid condominioId,
        EspacoComumDto dto,
        CancellationToken ct = default)
    {
        var e = await _espacoComumRepository.Query()
            .FirstOrDefaultAsync(x => x.Id == espacoId && x.CondominioId == condominioId, ct);
        if (e == null)
            throw new KeyNotFoundException("Espaço comum não encontrado.");

        if (!e.Nome.Equals(dto.Nome, StringComparison.OrdinalIgnoreCase))
        {
            var conflict = await _espacoComumRepository.Query()
                .AnyAsync(x => x.CondominioId == condominioId && x.Id != espacoId && x.Nome.ToLower() == dto.Nome.ToLower(), ct);
            if (conflict)
                throw new InvalidOperationException($"Outro espaço já usa o nome '{dto.Nome}'.");
        }

        e.Nome = dto.Nome;
        e.Descricao = dto.Descricao;
        e.Capacidade = dto.Capacidade;
        e.TaxaReserva = dto.TaxaReserva;
        e.HorarioFuncionamentoInicio = dto.HorarioFuncionamentoInicio;
        e.HorarioFuncionamentoFim = dto.HorarioFuncionamentoFim;
        e.TempoMinimoReservaMinutos = dto.TempoMinimoReservaMinutos;
        e.TempoMaximoReservaMinutos = dto.TempoMaximoReservaMinutos;
        e.AntecedenciaMaximaReservaDias = dto.AntecedenciaMaximaReservaDias;
        e.AntecedenciaMinimaCancelamentoHoras = dto.AntecedenciaMinimaCancelamentoHoras;
        e.LimiteReservasPorUnidadeMes = dto.LimiteReservasPorUnidadeMes;
        e.RequerAprovacaoSindico = dto.RequerAprovacaoSindico;
        e.ExibirNoMural = dto.ExibirNoMural;
        e.DiasIndisponiveis = dto.DiasIndisponiveis;
        e.PermiteVisualizacaoPublicaDetalhes = dto.PermiteVisualizacaoPublicaDetalhes;
        e.UpdatedAt = DateTime.UtcNow;

        await _espacoComumRepository.UpdateAsync(e, ct);
        await _espacoComumRepository.SaveChangesAsync(ct);

        dto.Id = e.Id;
        return dto;
    }

    public async Task<bool> ExcluirEspacoComumAsync(
        Guid espacoId,
        Guid condominioId,
        CancellationToken ct = default)
    {
        var e = await _espacoComumRepository.Query()
            .Include(x => x.Reservas) // Mantido como Reservas na entidade EspacoComum
            .FirstOrDefaultAsync(x => x.Id == espacoId && x.CondominioId == condominioId, ct);
        if (e == null)
            throw new KeyNotFoundException("Espaço comum não encontrado.");

        // A lógica de verificação de reservas futuras deve agora olhar para CalendarioItem
        // Esta parte precisa de ajuste se a relação em EspacoComum for para CalendarioItem
        // Assumindo que e.Reservas agora é ICollection<CalendarioItem>
        if (e.Reservas != null && e.Reservas.Any(ci => ci.Inicio >= DateTime.UtcNow && (ci.Status == ReservaStatus.Confirmada || ci.Status == ReservaStatus.Pendente)))
        {
            throw new InvalidOperationException("Existem agendamentos futuros/pendentes para este espaço. Não é possível excluir.");
        }

        await _espacoComumRepository.DeleteAsync(e, ct);
        await _espacoComumRepository.SaveChangesAsync(ct);
        return true;
    }
}
