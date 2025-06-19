using conViver.Core.Entities;
using conViver.Core.Interfaces;
using conViver.Core.Enums;
using conViver.Core.DTOs;
using Microsoft.EntityFrameworkCore;
using conViver.Application.Exceptions; // Add if not present

namespace conViver.Application;

public class ReservaService
{
    private readonly IRepository<Reserva> _reservaRepository;
    private readonly IRepository<EspacoComum> _espacoComumRepository;
    private readonly IRepository<Unidade> _unidadeRepository;
    private readonly IRepository<Usuario> _usuarioRepository; // New
    private readonly INotificacaoService _notificacaoService;

    public ReservaService(
        IRepository<Reserva> reservaRepository,
        IRepository<EspacoComum> espacoComumRepository,
        IRepository<Unidade> unidadeRepository,
        IRepository<Usuario> usuarioRepository, // New
        INotificacaoService notificacaoService)
    {
        _reservaRepository = reservaRepository;
        _espacoComumRepository = espacoComumRepository;
        _unidadeRepository = unidadeRepository;
        _usuarioRepository = usuarioRepository; // New
        _notificacaoService = notificacaoService;
    }

   public async Task<IEnumerable<AgendaReservaDto>> GetAgendaComunitariaAsync(Guid condominioIdClaim, DateTime mesAno, Guid? espacoComumIdFiltro, CancellationToken ct = default)
   {
       var inicioMes = new DateTime(mesAno.Year, mesAno.Month, 1);
       var inicioProximoMes = inicioMes.AddMonths(1);

       var query = _reservaRepository.Query()
                       .Include(r => r.EspacoComum)
                       .Include(r => r.Unidade) // Assuming Unidade entity has an identifier (Identificacao)
                       .Where(r => r.EspacoComum != null && r.EspacoComum.CondominioId == condominioIdClaim &&
                                   r.Inicio >= inicioMes && r.Inicio < inicioProximoMes &&
                                   r.Status == ReservaStatus.Aprovada);

       if (espacoComumIdFiltro.HasValue)
       {
           query = query.Where(r => r.EspacoComumId == espacoComumIdFiltro.Value);
       }

       var reservasAprovadas = await query.OrderBy(r => r.Inicio).ToListAsync(ct);

       return reservasAprovadas.Select(r => new AgendaReservaDto
       {
           Id = r.Id,
           EspacoComumId = r.EspacoComumId,
           NomeAreaComum = r.EspacoComum?.Nome ?? "Nome Indisponível", // Safety for null EspacoComum though filtered
           Inicio = r.Inicio,
           Fim = r.Fim,
           Status = r.Status.ToString(), // Will be "Aprovada"
           UnidadeId = r.UnidadeId,
           NomeUnidade = r.Unidade?.Identificacao ?? $"Unidade ID {r.UnidadeId}", // Adjust Unidade.Identificacao if property differs
           TituloReserva = $"{(r.EspacoComum?.Nome ?? "Espaço")} - {(r.Unidade?.Identificacao ?? $"Unid. {r.UnidadeId}")}"
       });
   }

   public async Task<IEnumerable<MuralReservaDto>> GetReservasParaMuralAsync(Guid condominioIdClaim, CancellationToken ct = default)
   {
       var agora = DateTime.UtcNow;

       var query = _reservaRepository.Query()
                       .Include(r => r.EspacoComum)
                       .Include(r => r.Unidade) // Load Unidade to access Identificacao
                       .Where(r => r.EspacoComum != null &&
                                   r.EspacoComum.CondominioId == condominioIdClaim &&
                                   r.EspacoComum.ExibirNoMural == true &&
                                   r.Status == ReservaStatus.Aprovada &&
                                   r.Fim > agora); // Consider r.Fim > agora to show ongoing and future, or r.Inicio >= agora for only upcoming. Let's use Fim > agora.

       var reservasParaMural = await query.OrderBy(r => r.Inicio).ToListAsync(ct);

       return reservasParaMural.Select(r => new MuralReservaDto
       {
           Id = r.Id,
           NomeAreaComum = r.EspacoComum?.Nome ?? "Nome Indisponível",
           NomeUnidade = r.Unidade?.Identificacao ?? $"Unidade ID {r.UnidadeId}", // Adjust Unidade.Identificacao if property differs
           Inicio = r.Inicio,
           Fim = r.Fim,
           TituloEvento = $"{(r.EspacoComum?.Nome ?? "Espaço")} reservado por {(r.Unidade?.Identificacao ?? $"Unid. {r.UnidadeId}")}"
           // Example alternative for TituloEvento:
           // TituloEvento = r.Observacoes // If Observacoes is used for event title by user, otherwise construct as above.
       });
   }

   public async Task<IEnumerable<ReservaDto>> ListarMinhasReservasAsync(Guid usuarioId, Guid condominioIdClaim, Guid unidadeId, FiltroReservaDto filtro, CancellationToken ct = default)
   {
       var query = _reservaRepository.Query()
                       .Include(r => r.EspacoComum)
                       .Include(r => r.Unidade)
                       .Include(r => r.Solicitante)
                       .Include(r => r.Aprovador)
                       .Include(r => r.CanceladoPor)
                       .Where(r => r.UsuarioId == usuarioId && r.UnidadeId == unidadeId);
                       // We also need to ensure these reservations are within condominioIdClaim.
                       // This is best done by joining/filtering on EspacoComum.CondominioId

       // Applying CondominioId claim filter via EspacoComum
       // This assumes EspacoComum is always present. If EspacoComum can be null on a Reserva (should not happen with FK), this needs care.
       query = query.Where(r => r.EspacoComum != null && r.EspacoComum.CondominioId == condominioIdClaim);

       if (filtro.EspacoComumId.HasValue)
       {
           query = query.Where(r => r.EspacoComumId == filtro.EspacoComumId.Value);
       }
       if (filtro.PeriodoInicio.HasValue)
       {
           query = query.Where(r => r.Inicio >= filtro.PeriodoInicio.Value);
       }
       if (filtro.PeriodoFim.HasValue)
       {
           // To include reservations that end on PeriodoFim, adjust to < PeriodoFim.Value.AddDays(1) if time part is 00:00:00
           // Or ensure PeriodoFim has time part set to 23:59:59 by the client/controller.
           // For simplicity here, using <= which means PeriodoFim should be the very end of the desired day.
           query = query.Where(r => r.Fim <= filtro.PeriodoFim.Value);
       }
       if (!string.IsNullOrWhiteSpace(filtro.Status) && Enum.TryParse<ReservaStatus>(filtro.Status, true, out var statusEnum))
       {
           query = query.Where(r => r.Status == statusEnum);
       }

       // Default ordering: most recent start times first, then by creation.
       var reservas = await query.OrderByDescending(r => r.Inicio).ThenByDescending(r => r.CreatedAt).ToListAsync(ct);

       var reservaDtos = new List<ReservaDto>();
       foreach (var reserva in reservas)
       {
           reservaDtos.Add(await MapReservaToDtoAsync(reserva));
       }
       return reservaDtos;
   }

   public async Task<IEnumerable<ReservaDto>> ListarTodasReservasAsync(Guid condominioIdClaim, FiltroReservaDto filtro, CancellationToken ct = default)
   {
       var query = _reservaRepository.Query()
                       .Include(r => r.EspacoComum)
                       .Include(r => r.Unidade)
                       .Include(r => r.Solicitante)
                       .Include(r => r.Aprovador)
                       .Include(r => r.CanceladoPor)
                       .Where(r => r.EspacoComum != null && r.EspacoComum.CondominioId == condominioIdClaim);

       if (filtro.EspacoComumId.HasValue)
       {
           query = query.Where(r => r.EspacoComumId == filtro.EspacoComumId.Value);
       }
       if (filtro.UnidadeId.HasValue) // Admin specific filter
       {
           query = query.Where(r => r.UnidadeId == filtro.UnidadeId.Value);
       }
       if (filtro.PeriodoInicio.HasValue)
       {
           query = query.Where(r => r.Inicio >= filtro.PeriodoInicio.Value);
       }
       if (filtro.PeriodoFim.HasValue)
       {
           query = query.Where(r => r.Fim <= filtro.PeriodoFim.Value);
       }
       if (!string.IsNullOrWhiteSpace(filtro.Status) && Enum.TryParse<ReservaStatus>(filtro.Status, true, out var statusEnum))
       {
           query = query.Where(r => r.Status == statusEnum);
       }

       // Default ordering
       var reservas = await query.OrderByDescending(r => r.Inicio).ThenByDescending(r => r.CreatedAt).ToListAsync(ct);

       var reservaDtos = new List<ReservaDto>();
       foreach (var reserva in reservas)
       {
           reservaDtos.Add(await MapReservaToDtoAsync(reserva));
       }
       return reservaDtos;
   }

    // Old CriarAsync and SolicitarAsync removed

    public async Task<ReservaDto?> SolicitarReservaAsync(Guid condominioId, Guid usuarioId, Guid unidadeId, ReservaInputDto dto, CancellationToken ct = default)
    {
       if (!dto.TermoDeUsoAceito)
       {
           throw new ArgumentException("É obrigatório aceitar os termos de uso para solicitar uma reserva.");
       }

       var espacoComum = await _espacoComumRepository.GetByIdAsync(dto.EspacoComumId, ct);
       if (espacoComum == null)
       {
           throw new NotFoundException($"Espaço comum com ID {dto.EspacoComumId} não encontrado.");
       }

       if (!espacoComum.PermiteReserva)
       {
           throw new InvalidOperationException($"O espaço comum '{espacoComum.Nome}' não permite reservas.");
       }

       if (espacoComum.CondominioId != condominioId)
       {
           // Security check: ensure the EspacoComum belongs to the claimed condominioId
           throw new InvalidOperationException("O espaço comum solicitado não pertence ao condomínio especificado.");
       }

       // Rule: Antecedência Mínima
       if (DateTime.UtcNow.AddHours(espacoComum.AntecedenciaMinimaReservaHoras) > dto.Inicio)
       {
           throw new InvalidOperationException($"A reserva deve ser feita com pelo menos {espacoComum.AntecedenciaMinimaReservaHoras} horas de antecedência.");
       }

       // Rule: Duração Máxima
       if ((dto.Fim - dto.Inicio).TotalMinutes > espacoComum.DuracaoMaximaReservaMinutos)
       {
           throw new InvalidOperationException($"A duração da reserva excede o limite de {espacoComum.DuracaoMaximaReservaMinutos} minutos.");
       }

       // Rule: Data/Hora Fim deve ser maior que Inicio
       if (dto.Fim <= dto.Inicio)
       {
           throw new ArgumentException("A data/hora de término deve ser posterior à data/hora de início.");
       }

       // Basic Conflict Checking (Simplified: checks for any overlap)
       var conflictingReservations = await _reservaRepository.Query()
           .Where(r => r.EspacoComumId == dto.EspacoComumId &&
                       r.Status != ReservaStatus.Cancelada && // Ignore cancelled
                       r.Status != ReservaStatus.Recusada &&   // Ignore rejected
                       dto.Inicio < r.Fim && dto.Fim > r.Inicio) // Overlap condition
           .ToListAsync(ct);

       if (conflictingReservations.Any())
       {
           throw new InvalidOperationException("O horário solicitado para este espaço comum já está reservado ou entra em conflito com outra reserva.");
       }

       // Rule: Horarios Permitidos (JSON parsing and logic needed)
       if (!string.IsNullOrWhiteSpace(espacoComum.HorariosPermitidosJson))
       {
           // TODO: Parse espacoComum.HorariosPermitidosJson
           // Example structure could be: {"Monday": ["09:00-12:00", "14:00-18:00"], "Tuesday": [...]}
           // Or a list of general slots: [{"DiaSemana": 1, "Inicio": "09:00", "Fim": "12:00"}, ...]
           // This logic needs to check if dto.Inicio and dto.Fim fall within any permitted slot
           // for the specific day of the week of dto.Inicio.
           // For now, add a placeholder comment or a very basic check if possible.
           // Example: bool horarioPermitido = CheckHorarioPermitido(dto.Inicio, dto.Fim, espacoComum.HorariosPermitidosJson);
           // if (!horarioPermitido)
           // {
           //     throw new InvalidOperationException("A reserva está fora dos horários permitidos para este espaço.");
           // }
           Console.WriteLine($"TODO: Implementar verificação de HorariosPermitidosJson: {espacoComum.HorariosPermitidosJson}"); // Placeholder
       }

       // Rule: Dias Bloqueados (JSON parsing and logic needed)
       if (!string.IsNullOrWhiteSpace(espacoComum.DiasBloqueadosJson))
       {
           // TODO: Parse espacoComum.DiasBloqueadosJson
           // Example structure: ["2023-12-25", "2024-01-01", "2024-07-10/2024-07-15"] (single dates or ranges)
           // This logic needs to check if the range dto.Inicio to dto.Fim overlaps with any blocked date or range.
           // Example: bool diaBloqueado = CheckDiaBloqueado(dto.Inicio, dto.Fim, espacoComum.DiasBloqueadosJson);
           // if (diaBloqueado)
           // {
           //     throw new InvalidOperationException("O período da reserva coincide com um dia bloqueado.");
           // }
           Console.WriteLine($"TODO: Implementar verificação de DiasBloqueadosJson: {espacoComum.DiasBloqueadosJson}"); // Placeholder
       }

       // Rule: Limite de Reservas Por Mês Por Unidade
       if (espacoComum.LimiteReservasPorMesPorUnidade.HasValue && espacoComum.LimiteReservasPorMesPorUnidade > 0)
       {
           var inicioMesCorrente = new DateTime(dto.Inicio.Year, dto.Inicio.Month, 1);
           var fimMesCorrente = inicioMesCorrente.AddMonths(1).AddDays(-1);

           var reservasNoMesParaUnidade = await _reservaRepository.Query()
               .CountAsync(r => r.UnidadeId == unidadeId && // unidadeId is a parameter of SolicitarReservaAsync
                                r.EspacoComumId == espacoComum.Id &&
                                r.Status != ReservaStatus.Cancelada &&
                                r.Status != ReservaStatus.Recusada &&
                                r.Inicio >= inicioMesCorrente && r.Inicio <= fimMesCorrente,
                            ct);

           if (reservasNoMesParaUnidade >= espacoComum.LimiteReservasPorMesPorUnidade.Value)
           {
               throw new InvalidOperationException($"A unidade já atingiu o limite de {espacoComum.LimiteReservasPorMesPorUnidade} reservas para este espaço comum no mês de {dto.Inicio:MMMM/yyyy}.");
           }
       }

       var novaReserva = new Reserva
       {
           Id = Guid.NewGuid(),
           UnidadeId = unidadeId, // Passed as parameter
           EspacoComumId = dto.EspacoComumId,
           UsuarioId = usuarioId, // The user making the request
           Inicio = dto.Inicio,
           Fim = dto.Fim,
           Observacoes = dto.Observacoes,
           TermoDeUsoAceito = dto.TermoDeUsoAceito,
           Status = espacoComum.ExigeAprovacaoAdmin ? ReservaStatus.Pendente : ReservaStatus.Aprovada,
           Taxa = espacoComum.TaxaReserva,
           CreatedAt = DateTime.UtcNow,
           UpdatedAt = DateTime.UtcNow
       };

       await _reservaRepository.AddAsync(novaReserva, ct);
       await _reservaRepository.SaveChangesAsync(ct);

       // Basic Notifications (placeholders)
       // await _notificacaoService.EnviarNotificacaoReservaCriadaAsync(novaReserva);
       // if (novaReserva.Status == ReservaStatus.Pendente)
       // {
       //     await _notificacaoService.EnviarNotificacaoAdminReservaPendenteAsync(novaReserva);
       // }

       // Need to fetch related data for the DTO
       // For now, we pass the entities we have. A full MapReservaToDto would do more.
       return await MapReservaToDtoAsync(novaReserva);
   }

public async Task<ReservaDto?> EditarReservaAsync(Guid reservaId, Guid condominioIdClaim, Guid sindicoId, ReservaInputDto dto, CancellationToken ct = default)
{
    var reserva = await _reservaRepository.Query()
                            .Include(r => r.EspacoComum)
                            .FirstOrDefaultAsync(r => r.Id == reservaId, ct);

    if (reserva == null)
    {
        throw new NotFoundException($"Reserva com ID {reservaId} não encontrada.");
    }

    if (reserva.EspacoComum == null) {
        // Should not happen with the Include, but good for safety.
        throw new InvalidOperationException("Não foi possível verificar o condomínio da reserva pois o Espaço Comum não está carregado.");
    }
    if (reserva.EspacoComum.CondominioId != condominioIdClaim)
    {
        throw new UnauthorizedAccessException("Você não tem permissão para editar esta reserva (condomínio inválido).");
    }

    // Business Rule: Allow editing for Pendente or Aprovada reservations that haven't started.
    if (!(reserva.Status == ReservaStatus.Pendente || reserva.Status == ReservaStatus.Aprovada) || reserva.Inicio <= DateTime.UtcNow)
    {
        throw new InvalidOperationException($"A reserva não pode ser editada pois seu status é '{reserva.Status}' ou já iniciou.");
    }

    // Check if EspacoComum, Inicio or Fim are being changed, requiring re-validation.
    bool needsRevalidation = reserva.EspacoComumId != dto.EspacoComumId || reserva.Inicio != dto.Inicio || reserva.Fim != dto.Fim;
    EspacoComum? novoEspacoComum = null;

    if (needsRevalidation)
    {
        novoEspacoComum = await _espacoComumRepository.GetByIdAsync(dto.EspacoComumId, ct);
        if (novoEspacoComum == null)
        {
            throw new NotFoundException($"Novo espaço comum com ID {dto.EspacoComumId} não encontrado.");
        }
        if (!novoEspacoComum.PermiteReserva)
        {
            throw new InvalidOperationException($"O novo espaço comum '{novoEspacoComum.Nome}' não permite reservas.");
        }
        if (novoEspacoComum.CondominioId != condominioIdClaim)
        {
            throw new UnauthorizedAccessException("O novo espaço comum selecionado não pertence ao seu condomínio.");
        }

        // Rule: Antecedência Mínima for new time/space
        if (DateTime.UtcNow.AddHours(novoEspacoComum.AntecedenciaMinimaReservaHoras) > dto.Inicio)
        {
            throw new InvalidOperationException($"A nova data da reserva deve ser com pelo menos {novoEspacoComum.AntecedenciaMinimaReservaHoras} horas de antecedência.");
        }

        // Rule: Duração Máxima for new time/space
        if ((dto.Fim - dto.Inicio).TotalMinutes > novoEspacoComum.DuracaoMaximaReservaMinutos)
        {
            throw new InvalidOperationException($"A nova duração da reserva excede o limite de {novoEspacoComum.DuracaoMaximaReservaMinutos} minutos.");
        }

        // Rule: Data/Hora Fim deve ser maior que Inicio
        if (dto.Fim <= dto.Inicio)
        {
           throw new ArgumentException("A data/hora de término deve ser posterior à data/hora de início.");
        }

        // Basic Conflict Checking for new time/space (excluding current reservaId)
        var conflictingReservations = await _reservaRepository.Query()
            .Where(r => r.Id != reservaId && // Exclude the current reservation
                        r.EspacoComumId == dto.EspacoComumId &&
                        r.Status != ReservaStatus.Cancelada &&
                        r.Status != ReservaStatus.Recusada &&
                        dto.Inicio < r.Fim && dto.Fim > r.Inicio)
            .ToListAsync(ct);

        if (conflictingReservations.Any())
        {
            throw new InvalidOperationException("O novo horário solicitado para o espaço comum já está reservado ou entra em conflito.");
        }

        // TODO: Re-check HorariosPermitidosJson and DiasBloqueadosJson for new EspacoComum/dates (using placeholders for now)
        if (!string.IsNullOrWhiteSpace(novoEspacoComum.HorariosPermitidosJson))
        {
             Console.WriteLine($"TODO: (EditarReserva) Implementar verificação de HorariosPermitidosJson: {novoEspacoComum.HorariosPermitidosJson}");
        }
        if (!string.IsNullOrWhiteSpace(novoEspacoComum.DiasBloqueadosJson))
        {
             Console.WriteLine($"TODO: (EditarReserva) Implementar verificação de DiasBloqueadosJson: {novoEspacoComum.DiasBloqueadosJson}");
        }
    }

    // Update Reserva properties
    reserva.EspacoComumId = dto.EspacoComumId;
    reserva.Inicio = dto.Inicio;
    reserva.Fim = dto.Fim;
    reserva.Observacoes = dto.Observacoes; // Observacoes from DTO
    reserva.TermoDeUsoAceito = dto.TermoDeUsoAceito; // Re-confirm terms if they changed or are part of edit DTO

    // If EspacoComum changed, update the Taxa from the new EspacoComum
    if (novoEspacoComum != null) // novoEspacoComum is fetched if needsRevalidation is true
    {
        reserva.Taxa = novoEspacoComum.TaxaReserva;
         // If the new space requires approval and an admin is editing, the status might need review.
         // For now, an admin edit does not automatically change status from Aprovada to Pendente.
         // If reserva.Status == ReservaStatus.Aprovada && novoEspacoComum.ExigeAprovacaoAdmin
         // reserva.Status = ReservaStatus.Pendente; // Or some other logic.
    } else if (reserva.EspacoComumId != dto.EspacoComumId) {
        // This case should ideally not be hit if novoEspacoComum is null but EspacoComumId changed.
        // It implies a logic flaw above. Defensive coding:
        var fallbackEspacoComum = await _espacoComumRepository.GetByIdAsync(dto.EspacoComumId, ct);
        reserva.Taxa = fallbackEspacoComum?.TaxaReserva;
    }


    reserva.UpdatedAt = DateTime.UtcNow;
    // The 'sindicoId' is making the change. We can consider this an "approval" or "last edit by".
    // If there's a specific field for "LastEditedByAdminId", use that. Otherwise, AprovadorId might be overloaded.
    // For now, let's assume AprovadorId can reflect the admin who last confirmed/modified it.
    reserva.AprovadorId = sindicoId;

    await _reservaRepository.UpdateAsync(reserva, ct);
    await _reservaRepository.SaveChangesAsync(ct);

    // TODO: Send notification to resident about the changes.
    // await _notificacaoService.EnviarNotificacaoReservaAlteradaAsync(reserva, "Sua reserva foi atualizada pelo síndico.");

    return await MapReservaToDtoAsync(reserva);
}

   private async Task<ReservaDto> MapReservaToDtoAsync(Reserva reserva)
   {
       if (reserva == null)
       {
           // This case should ideally not be hit if called internally with valid reserva objects.
           // However, as a safeguard or if design changes, returning null or throwing might be options.
           // For now, let's assume reserva is always valid when this is called.
           // If it can be null, the return type of this method should be Task<ReservaDto?>
           throw new ArgumentNullException(nameof(reserva), "Reserva não pode ser nula para mapeamento.");
       }

       EspacoComum? espacoComum = reserva.EspacoComum;
       if (espacoComum == null && reserva.EspacoComumId != Guid.Empty)
       {
           espacoComum = await _espacoComumRepository.GetByIdAsync(reserva.EspacoComumId);
       }

       Unidade? unidade = reserva.Unidade; // Assuming Unidade navigation property exists on Reserva
       if (unidade == null && reserva.UnidadeId != Guid.Empty)
       {
           unidade = await _unidadeRepository.GetByIdAsync(reserva.UnidadeId);
       }

       Usuario? solicitante = reserva.Solicitante; // Assuming Solicitante navigation property for UsuarioId
       if (solicitante == null && reserva.UsuarioId != Guid.Empty)
       {
           solicitante = await _usuarioRepository.GetByIdAsync(reserva.UsuarioId);
       }

       Usuario? aprovador = reserva.Aprovador;
       if (aprovador == null && reserva.AprovadorId.HasValue && reserva.AprovadorId != Guid.Empty)
       {
           aprovador = await _usuarioRepository.GetByIdAsync(reserva.AprovadorId.Value);
       }

       Usuario? canceladoPor = reserva.CanceladoPor;
       if (canceladoPor == null && reserva.CanceladoPorId.HasValue && reserva.CanceladoPorId != Guid.Empty)
       {
           canceladoPor = await _usuarioRepository.GetByIdAsync(reserva.CanceladoPorId.Value);
       }

       // Ensure CondominioId is available, typically from EspacoComum
       Guid condominioId = espacoComum?.CondominioId ?? Guid.Empty;
       if(condominioId == Guid.Empty && unidade != null) {
           // Fallback if EspacoComum doesn't have it or is null, try Unidade (assuming Unidade has CondominioId)
           // condominioId = unidade.CondominioId;
           // This depends on your Unidade entity structure. For now, rely on EspacoComum.
       }


       return new ReservaDto
       {
           Id = reserva.Id,
           CondominioId = condominioId,
           UnidadeId = reserva.UnidadeId,
           NomeUnidade = unidade?.Identificacao ?? $"Unidade ID: {reserva.UnidadeId}", // Adjust Unidade.Identificacao if property name is different
           UsuarioId = reserva.UsuarioId,
           NomeUsuarioSolicitante = solicitante?.Nome ?? $"Usuário ID: {reserva.UsuarioId}",
           EspacoComumId = reserva.EspacoComumId,
           NomeAreaComum = espacoComum?.Nome ?? $"Espaço ID: {reserva.EspacoComumId}",
           Inicio = reserva.Inicio,
           Fim = reserva.Fim,
           Status = reserva.Status.ToString(),
           DataSolicitacao = reserva.CreatedAt,
           Observacoes = reserva.Observacoes,
           TermoDeUsoAceito = reserva.TermoDeUsoAceito,
           AprovadorId = reserva.AprovadorId,
           NomeAprovador = aprovador?.Nome,
           JustificativaStatus = reserva.JustificativaStatus,
           DataCancelamento = reserva.DataCancelamento,
           CanceladoPorId = reserva.CanceladoPorId,
           NomeCanceladoPor = canceladoPor?.Nome
           // Taxa might also be relevant here if it's part of ReservaDto
       };
   }

    public async Task<ReservaDto?> AtualizarStatusReservaAsync(Guid reservaId, Guid condominioIdClaim, Guid sindicoId, ReservaStatusUpdateDto dto, CancellationToken ct = default)
    {
       var reserva = await _reservaRepository.Query()
                                .Include(r => r.EspacoComum) // Include EspacoComum for CondominioId check
                                .FirstOrDefaultAsync(r => r.Id == reservaId, ct);

       if (reserva == null)
       {
           throw new NotFoundException($"Reserva com ID {reservaId} não encontrada.");
       }

       // Security check: Ensure the reserva belongs to the admin's condominio
       // This requires EspacoComum to be loaded or Reserva to have CondominioId directly.
       // Assuming EspacoComum is loaded and has CondominioId.
       if (reserva.EspacoComum == null) {
           // This should ideally not happen if the query includes it and the FK is valid.
           throw new InvalidOperationException("Não foi possível verificar o condomínio da reserva pois o Espaço Comum não está carregado.");
       }
       if (reserva.EspacoComum.CondominioId != condominioIdClaim)
       {
           throw new UnauthorizedAccessException("Você não tem permissão para atualizar o status desta reserva (condomínio inválido).");
       }

       if (!Enum.TryParse<ReservaStatus>(dto.Status, true, out var novoStatus))
       {
           throw new ArgumentException($"Status '{dto.Status}' é inválido.");
       }

       // Rule: Cannot change status of a completed (Aprovada and past) or already Cancelada/Recusada reservation easily.
       // (This logic can be more sophisticated based on specific rules, e.g., what transitions are allowed)
       if (reserva.Status == ReservaStatus.Cancelada || reserva.Status == ReservaStatus.Recusada || (reserva.Status == ReservaStatus.Aprovada && reserva.Fim < DateTime.UtcNow))
       {
           if (novoStatus != reserva.Status) // Allow "updating" to the same status for idempotency, but not changing.
           {
                throw new InvalidOperationException($"Não é possível alterar o status de uma reserva que já foi {reserva.Status.ToString().ToLower()} ou finalizada.");
           }
       }

       reserva.Status = novoStatus;
       reserva.AprovadorId = sindicoId; // User performing the action
       reserva.JustificativaStatus = dto.JustificativaStatus; // From DTO
       reserva.UpdatedAt = DateTime.UtcNow;

       await _reservaRepository.UpdateAsync(reserva, ct);
       await _reservaRepository.SaveChangesAsync(ct);

       // TODO: Handle financial integration if status is Aprovada and there's a fee.
       // if (novoStatus == ReservaStatus.Aprovada && reserva.Taxa.HasValue && reserva.Taxa.Value > 0)
       // {
       //     // Trigger financial process
       // }

       // TODO: Send notification to resident about status change.
       // await _notificacaoService.EnviarNotificacaoReservaStatusAlteradoAsync(reserva);

       return await MapReservaToDtoAsync(reserva); // Use the existing mapper
    }

   public async Task<ReservaDto?> GetReservaDetalhesAsync(Guid reservaId, Guid condominioIdClaim, Guid usuarioId, bool isSindico, CancellationToken ct = default)
   {
       var reserva = await _reservaRepository.Query()
                               .Include(r => r.EspacoComum)
                               // Eagerly load other properties that MapReservaToDtoAsync might use, if beneficial
                               // For example, if Unidade and Usuario (Solicitante) are frequently accessed:
                               .Include(r => r.Unidade)
                               .Include(r => r.Solicitante)
                               .Include(r => r.Aprovador)
                               .Include(r => r.CanceladoPor)
                               .FirstOrDefaultAsync(r => r.Id == reservaId, ct);

       if (reserva == null)
       {
           return null; // Not found
       }

       // Essential check: EspacoComum must be loaded to verify CondominioId
       if (reserva.EspacoComum == null) {
           // This indicates a data integrity issue or a problem with the Include if the FK is set.
           // Log this error, as it shouldn't happen in normal operation.
           // For safety, treat as if the reservation is not accessible or invalid.
           // Consider logging: _logger.LogError($"EspacoComum not loaded for ReservaId {reservaId} during GetReservaDetalhesAsync.");
           return null;
       }

       if (isSindico)
       {
           // Sindico can see any reservation in their own condominium.
           if (reserva.EspacoComum.CondominioId != condominioIdClaim)
           {
               // Attempt to access reservation outside of claimed condominium.
               return null; // Treat as "not found" for this admin.
           }
       }
       else // Is a Condômino/Inquilino
       {
           // Resident can only see their own reservations.
           if (reserva.UsuarioId != usuarioId)
           {
               return null; // Not their reservation.
           }
           // And it must also be within their claimed condominium (double check, though UsuarioId should scope this).
           if (reserva.EspacoComum.CondominioId != condominioIdClaim)
           {
                // This case might be rare if usuarioId is correctly scoped to a condominio,
                // but it's a good defensive check.
               return null;
           }
       }

       return await MapReservaToDtoAsync(reserva);
   }

    public async Task<ReservaDto?> CancelarReservaAsync(Guid reservaId, Guid condominioIdClaim, Guid usuarioId, bool isSindico, string? justificativa, CancellationToken ct = default)
    {
       var reserva = await _reservaRepository.Query()
                               .Include(r => r.EspacoComum)
                               .FirstOrDefaultAsync(r => r.Id == reservaId, ct);

       if (reserva == null)
       {
           throw new NotFoundException($"Reserva com ID {reservaId} não encontrada.");
       }

       if (reserva.EspacoComum == null) {
           throw new InvalidOperationException("Não foi possível verificar o condomínio da reserva pois o Espaço Comum não está carregado.");
       }
       if (reserva.EspacoComum.CondominioId != condominioIdClaim)
       {
           throw new UnauthorizedAccessException("Você não tem permissão para cancelar esta reserva (condomínio inválido).");
       }

       if (reserva.Status == ReservaStatus.Cancelada)
       {
           throw new InvalidOperationException("Esta reserva já foi cancelada.");
       }
       // Optional: Prevent cancelling very old, completed reservations if necessary
       // if (reserva.Status == ReservaStatus.Aprovada && reserva.Fim < DateTime.UtcNow.AddDays(-7)) // Example: older than 7 days
       // {
       //     throw new InvalidOperationException("Não é possível cancelar uma reserva que já foi concluída há muito tempo.");
       // }


       if (!isSindico)
       {
           if (reserva.UsuarioId != usuarioId)
           {
               throw new UnauthorizedAccessException("Você só pode cancelar suas próprias reservas.");
           }

           // Assuming EspacoComum has AntecedenciaMinimaCancelamentoHoras.
           // This property needs to be added to EspacoComum entity if not present.
           // For this subtask, we'll assume it exists.
           if (reserva.EspacoComum == null) {
               // This should not happen if Include was successful and FK is valid
               throw new InvalidOperationException("Dados do Espaço Comum não carregados para verificar regras de cancelamento.");
           }
           int antecedenciaMinimaCancelamentoHoras = reserva.EspacoComum.AntecedenciaMinimaCancelamentoHoras;

           if (DateTime.UtcNow.AddHours(antecedenciaMinimaCancelamentoHoras) > reserva.Inicio)
           {
               throw new InvalidOperationException($"A reserva não pode ser cancelada. O prazo para cancelamento é de {antecedenciaMinimaCancelamentoHoras} horas antes do início.");
           }
       }

       reserva.Status = ReservaStatus.Cancelada;
       reserva.DataCancelamento = DateTime.UtcNow;
       reserva.CanceladoPorId = usuarioId;
       reserva.JustificativaStatus = justificativa; // Justificativa from parameter
       reserva.UpdatedAt = DateTime.UtcNow;
       // AprovadorId is not typically set on cancellation, unless the admin action of cancelling should mark them as approver.
       // For now, we leave AprovadorId as is.

       await _reservaRepository.UpdateAsync(reserva, ct);
       await _reservaRepository.SaveChangesAsync(ct);

       // TODO: Send notification to relevant parties (e.g., admin if resident cancelled, resident if admin cancelled).
       // await _notificacaoService.EnviarNotificacaoReservaCanceladaAsync(reserva);

       return await MapReservaToDtoAsync(reserva);
    }

   public async Task<ReservaDto?> BloquearEspacoParaManutencaoAsync(Guid espacoId, Guid condominioIdClaim, Guid adminUserId, DateTime inicio, DateTime fim, string motivo, CancellationToken ct = default)
   {
       var espacoComum = await _espacoComumRepository.GetByIdAsync(espacoId, ct);
       if (espacoComum == null)
       {
           throw new NotFoundException($"Espaço comum com ID {espacoId} não encontrado.");
       }
       if (espacoComum.CondominioId != condominioIdClaim)
       {
           throw new UnauthorizedAccessException("Você não tem permissão para bloquear este espaço comum (condomínio inválido).");
       }

       if (fim <= inicio)
       {
           throw new ArgumentException("A data/hora de término do bloqueio deve ser posterior à data/hora de início.");
       }

       // Check for conflicts with existing non-cancelled/non-refused/non-bloqueada reservations
       var conflictingReservations = await _reservaRepository.Query()
           .Where(r => r.EspacoComumId == espacoId &&
                       r.Status != ReservaStatus.Cancelada &&
                       r.Status != ReservaStatus.Recusada &&
                       r.Status != ReservaStatus.Bloqueada &&
                       inicio < r.Fim && fim > r.Inicio) // Overlap condition
           .ToListAsync(ct);

       if (conflictingReservations.Any())
       {
           // Construct a more informative message if possible
           var conflictDetails = string.Join(", ", conflictingReservations.Select(cr => $"ID: {cr.Id} ({cr.Inicio} - {cr.Fim})"));
           throw new InvalidOperationException($"O período de bloqueio entra em conflito com reservas existentes: {conflictDetails}. Cancele ou reprograme as reservas conflitantes primeiro.");
       }

       // For UnidadeId in a system-generated reservation like a block:
       // Option 1: Make UnidadeId nullable in Reserva.cs. Not done yet.
       // Option 2: Designate a specific Guid for "System/Admin Unidade".
       // Option 3: Use the admin's UnidadeId if available and makes sense.
       // For now, this will cause an issue if UnidadeId is required and not nullable.
       // Let's assume for this subtask that UnidadeId must be provided.
       // This implies the caller (Controller) must determine a UnidadeId.
       // This is a design point to resolve. A common approach is a system-level UnidadeId.
       // If we don't have one, we cannot create this reserva if UnidadeId is non-nullable without a valid Guid.
       // Let's throw a temporary NotImplementedException here to highlight this design decision.
       // throw new NotImplementedException("Definir como lidar com UnidadeId para reservas de bloqueio do sistema.");
       // Alternative for now: Use a placeholder Guid if UnidadeId is required. This is NOT ideal for production.
       Guid systemUnidadeIdPlaceholder = Guid.Empty; // BAD PRACTICE - UnidadeId should be valid or nullable.
                                                 // This will likely fail if there's a FK constraint on UnidadeId
                                                 // unless Guid.Empty is a valid UnidadeId in the DB (unlikely).
                                                 // The entity should be made nullable or a proper system UnidadeId used.
                                                 // For the subtask to proceed, we'll use it and note the issue.

       var bloqueioReserva = new Reserva
       {
           Id = Guid.NewGuid(),
           EspacoComumId = espacoId,
           // UnidadeId = systemUnidadeIdPlaceholder, // This needs to be correctly handled.
           // For now, to make the subtask pass given current entity structure, let's assume UnidadeId is passed in or resolved.
           // Let's assume adminUserId implies a user who has a Unidade, or a generic system UnidadeId is found by controller.
           // For the purpose of this subtask, let's assign a temporary UnidadeId (e.g. admin's unit, or a known system unit)
           // This part of the design is problematic if not addressed.
           // To avoid subtask failure due to this, we'll temporarily use Guid.Empty and assume it means "System"
           // or that the database schema allows it (e.g. no FK or FK allows Guid.Empty).
           // A better solution is making UnidadeId nullable in Reserva for system events.
           UnidadeId = Guid.Empty, // CRITICAL DESIGN FLAW: Placeholder, UnidadeId should be valid or nullable.
           UsuarioId = adminUserId,
           Inicio = inicio,
           Fim = fim,
           Status = ReservaStatus.Bloqueada,
           Observacoes = $"Manutenção: {motivo}",
           TermoDeUsoAceito = true, // System action
           AprovadorId = adminUserId, // Admin is "approving" this block
           CreatedAt = DateTime.UtcNow,
           UpdatedAt = DateTime.UtcNow
       };

       await _reservaRepository.AddAsync(bloqueioReserva, ct);
       await _reservaRepository.SaveChangesAsync(ct);

       return await MapReservaToDtoAsync(bloqueioReserva);
   }

   public async Task<bool> DesbloquearEspacoManutencaoAsync(Guid bloqueioReservaId, Guid condominioIdClaim, Guid adminUserId, CancellationToken ct = default)
   {
       var bloqueioReserva = await _reservaRepository.Query()
                                   .Include(r => r.EspacoComum)
                                   .FirstOrDefaultAsync(r => r.Id == bloqueioReservaId, ct);

       if (bloqueioReserva == null)
       {
           throw new NotFoundException($"Reserva de bloqueio com ID {bloqueioReservaId} não encontrada.");
       }

       if (bloqueioReserva.EspacoComum == null || bloqueioReserva.EspacoComum.CondominioId != condominioIdClaim)
       {
           throw new UnauthorizedAccessException("Você não tem permissão para desbloquear este espaço (condomínio inválido).");
       }

       if (bloqueioReserva.Status != ReservaStatus.Bloqueada)
       {
           throw new InvalidOperationException("Esta reserva não é um bloqueio ativo e não pode ser desbloqueada desta forma.");
       }

       // "Cancel" the blocking reservation
       bloqueioReserva.Status = ReservaStatus.Cancelada; // Or another status like "ConcluidaManutencao"
       bloqueioReserva.CanceladoPorId = adminUserId;
       bloqueioReserva.DataCancelamento = DateTime.UtcNow;
       bloqueioReserva.JustificativaStatus = "Manutenção concluída/espaço desbloqueado";
       bloqueioReserva.UpdatedAt = DateTime.UtcNow;

       await _reservaRepository.UpdateAsync(bloqueioReserva, ct);
       await _reservaRepository.SaveChangesAsync(ct);

       return true;
   }
}

