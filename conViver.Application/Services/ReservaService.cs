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

namespace conViver.Application.Services;

public class ReservaService
{
    private readonly IRepository<Reserva> _reservaRepository;
    private readonly IRepository<EspacoComum> _espacoComumRepository;
    private readonly IRepository<Unidade> _unidadeRepository;
    private readonly IRepository<Usuario> _usuarioRepository;

    public ReservaService(
        IRepository<Reserva> reservaRepository,
        IRepository<EspacoComum> espacoComumRepository,
        IRepository<Unidade> unidadeRepository,
        IRepository<Usuario> usuarioRepository)
    {
        _reservaRepository = reservaRepository;
        _espacoComumRepository = espacoComumRepository;
        _unidadeRepository = unidadeRepository;
        _usuarioRepository = usuarioRepository;
    }

    public async Task<IEnumerable<EspacoComumDto>> ListarEspacosComunsAsync(Guid condominioId, CancellationToken ct = default)
    {
        return await _espacoComumRepository.Query()
            .Where(e => e.CondominioId == condominioId)
            .Select(e => new EspacoComumDto
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
                ExibirNoMural = e.ExibirNoMural
            }).ToListAsync(ct);
    }

    public async Task<IEnumerable<AgendaReservaDto>> GetAgendaAsync(Guid condominioId, DateTime mesAno, Guid usuarioLogadoId, CancellationToken ct = default)
    {
        var inicioMes = new DateTime(mesAno.Year, mesAno.Month, 1);
        var fimMes = inicioMes.AddMonths(1).AddDays(-1).AddHours(23).AddMinutes(59).AddSeconds(59);

        var reservasNoMes = await _reservaRepository.Query()
            .Include(r => r.EspacoComum)
            .Include(r => r.Unidade)
            .Where(r => r.EspacoComum != null && r.EspacoComum.CondominioId == condominioId &&
                         r.Inicio <= fimMes && r.Fim >= inicioMes &&
                         r.Status != ReservaStatus.Recusada && r.Status != ReservaStatus.CanceladaPeloUsuario && r.Status != ReservaStatus.CanceladaPeloSindico)
            .ToListAsync(ct);

        return reservasNoMes.Select(r => new AgendaReservaDto
        {
            Id = r.Id,
            EspacoComumId = r.EspacoComumId,
            NomeEspacoComum = r.EspacoComum?.Nome ?? "N/A",
            Inicio = r.Inicio,
            Fim = r.Fim,
            Status = r.Status.ToString(),
            UnidadeId = r.UnidadeId,
            NomeUnidade = r.Unidade?.Nome,
            TituloReserva = $"{r.EspacoComum?.Nome} - {(r.Unidade?.Nome ?? $"Unid. {r.UnidadeId.ToString().Substring(0,4)}")}",
            PertenceAoUsuarioLogado = r.UsuarioId == usuarioLogadoId
        });
    }

    public async Task<ReservaDto?> SolicitarAsync(Guid condominioId, Guid usuarioId, ReservaInputDto dto, CancellationToken ct = default)
    {
        var espacoComum = await _espacoComumRepository.GetByIdAsync(dto.EspacoComumId, ct);
        if (espacoComum == null || espacoComum.CondominioId != condominioId)
        {
            throw new ArgumentException("Espaço comum inválido ou não pertence ao condomínio.");
        }

        Guid unidadeIdParaReserva;
        var usuario = await _usuarioRepository.GetByIdAsync(usuarioId, ct);
        if(usuario == null) throw new ArgumentException("Usuário solicitante não encontrado.");

        // Definindo UnidadeId: usa a do DTO se fornecida (e válida), senão a do usuário.
        // Adicionar validação se síndico pode reservar para qualquer unidade.
        if (dto.UnidadeId.HasValue && dto.UnidadeId.Value != Guid.Empty) {
             var unidadeEspecificada = await _unidadeRepository.GetByIdAsync(dto.UnidadeId.Value, ct);
             if (unidadeEspecificada == null || unidadeEspecificada.CondominioId != condominioId) {
                  throw new ArgumentException("Unidade especificada no DTO é inválida ou não pertence ao condomínio.");
             }
             // TODO: Adicionar lógica de permissão: Síndico pode especificar qualquer UnidadeId válida do condomínio.
             // Não-síndico só pode usar sua própria UnidadeId (ou se dto.UnidadeId for nulo/Guid.Empty).
             unidadeIdParaReserva = unidadeEspecificada.Id;
        } else {
            unidadeIdParaReserva = usuario.UnidadeId;
        }


        // Validação de Regras do Espaço Comum
        if (TimeSpan.TryParse(espacoComum.HorarioFuncionamentoInicio, out var inicioFuncionamento) &&
            TimeSpan.TryParse(espacoComum.HorarioFuncionamentoFim, out var fimFuncionamento))
        {
            if (dto.Inicio.TimeOfDay < inicioFuncionamento || dto.Fim.TimeOfDay > fimFuncionamento || dto.Inicio.TimeOfDay >= fimFuncionamento )
            {
                throw new InvalidOperationException($"O horário solicitado está fora do período de funcionamento do espaço ({espacoComum.HorarioFuncionamentoInicio} - {espacoComum.HorarioFuncionamentoFim}).");
            }
        }

        var duracaoReservaMinutos = (dto.Fim - dto.Inicio).TotalMinutes;
        if (espacoComum.TempoMinimoReservaMinutos.HasValue && duracaoReservaMinutos < espacoComum.TempoMinimoReservaMinutos.Value)
        {
            throw new InvalidOperationException($"A duração mínima da reserva para este espaço é de {espacoComum.TempoMinimoReservaMinutos} minutos.");
        }
        if (espacoComum.TempoMaximoReservaMinutos.HasValue && duracaoReservaMinutos > espacoComum.TempoMaximoReservaMinutos.Value)
        {
            throw new InvalidOperationException($"A duração máxima da reserva para este espaço é de {espacoComum.TempoMaximoReservaMinutos} minutos.");
        }

        if (espacoComum.AntecedenciaMaximaReservaDias.HasValue && dto.Inicio.Date > DateTime.UtcNow.Date.AddDays(espacoComum.AntecedenciaMaximaReservaDias.Value))
        {
            throw new InvalidOperationException($"Não é possível reservar com mais de {espacoComum.AntecedenciaMaximaReservaDias} dias de antecedência.");
        }

        if (dto.Inicio < DateTime.UtcNow)
        {
             throw new InvalidOperationException("Não é possível realizar reservas para datas ou horários no passado.");
        }

        if (espacoComum.LimiteReservasPorUnidadeMes.HasValue && espacoComum.LimiteReservasPorUnidadeMes > 0)
        {
            var inicioDoMesDaReserva = new DateTime(dto.Inicio.Year, dto.Inicio.Month, 1);
            var fimDoMesDaReserva = inicioDoMesDaReserva.AddMonths(1).AddDays(-1).AddHours(23).AddMinutes(59).AddSeconds(59);

            var reservasNoMesPelaUnidade = await _reservaRepository.Query()
                .CountAsync(r => r.EspacoComumId == dto.EspacoComumId &&
                                 r.UnidadeId == unidadeIdParaReserva &&
                                 r.Inicio >= inicioDoMesDaReserva && r.Inicio <= fimDoMesDaReserva &&
                                 (r.Status == ReservaStatus.Confirmada || r.Status == ReservaStatus.Pendente),
                                 ct);

            if (reservasNoMesPelaUnidade >= espacoComum.LimiteReservasPorUnidadeMes.Value)
            {
                throw new InvalidOperationException($"A unidade já atingiu o limite de {espacoComum.LimiteReservasPorUnidadeMes} reservas para este espaço neste mês.");
            }
        }

        bool hasConflict = await _reservaRepository.Query()
            .AnyAsync(r => r.EspacoComumId == dto.EspacoComumId &&
                           r.Status != ReservaStatus.CanceladaPeloSindico && r.Status != ReservaStatus.CanceladaPeloUsuario && r.Status != ReservaStatus.Recusada &&
                           ((dto.Inicio >= r.Inicio && dto.Inicio < r.Fim) ||
                            (dto.Fim > r.Inicio && dto.Fim <= r.Fim) ||
                            (dto.Inicio <= r.Inicio && dto.Fim >= r.Fim))),
                           ct);

        if (hasConflict)
        {
            throw new InvalidOperationException("Conflito de horário. O espaço já está reservado para o período solicitado.");
        }

        var reserva = new Reserva
        {
            Id = Guid.NewGuid(),
            CondominioId = condominioId,
            UnidadeId = unidadeIdParaReserva,
            UsuarioId = usuarioId,
            EspacoComumId = dto.EspacoComumId,
            Inicio = dto.Inicio,
            Fim = dto.Fim,
            Observacoes = dto.Observacoes,
            Status = espacoComum.RequerAprovacaoSindico ? ReservaStatus.Pendente : ReservaStatus.Confirmada,
            Taxa = espacoComum.TaxaReserva,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _reservaRepository.AddAsync(reserva, ct);
        await _reservaRepository.SaveChangesAsync(ct);

        return await GetByIdAsync(reserva.Id, condominioId, usuarioId, false, ct); // isSindico = false para solicitante
    }

    public async Task<ReservaDto?> AtualizarStatusAsync(Guid reservaId, Guid condominioId, Guid sindicoUserId, ReservaStatusUpdateDto dto, CancellationToken ct = default)
    {
        var reserva = await _reservaRepository.Query().FirstOrDefaultAsync(r => r.Id == reservaId && r.CondominioId == condominioId, ct);
        if (reserva == null)  throw new KeyNotFoundException("Reserva não encontrada.");

        if (!Enum.TryParse<ReservaStatus>(dto.Status, true, out var novoStatus))
        {
            throw new ArgumentException("Status inválido fornecido.");
        }

        if ((reserva.Status == ReservaStatus.CanceladaPeloUsuario || reserva.Status == ReservaStatus.CanceladaPeloSindico) && novoStatus != reserva.Status) { // Não pode mudar status de cancelada, exceto se for para o mesmo.
            throw new InvalidOperationException("Não é possível alterar o status de uma reserva já cancelada.");
        }
        // Adicionar mais lógica de transição se necessário
        // Ex: if (reserva.Status == ReservaStatus.Recusada && novoStatus == ReservaStatus.Confirmada) { ... }

        reserva.Status = novoStatus;
        reserva.JustificativaAprovacaoRecusa = dto.Justificativa;
        reserva.AprovadorId = sindicoUserId;
        reserva.UpdatedAt = DateTime.UtcNow;

        await _reservaRepository.UpdateAsync(reserva, ct);
        await _reservaRepository.SaveChangesAsync(ct);

        return await GetByIdAsync(reservaId, condominioId, sindicoUserId, true, ct); // isSindico = true
    }

    public async Task<ReservaDto?> GetByIdAsync(Guid reservaId, Guid condominioId, Guid usuarioId, bool isSindico, CancellationToken ct = default)
    {
        var reserva = await _reservaRepository.Query()
            .Include(r => r.EspacoComum)
            .Include(r => r.Unidade)
            .FirstOrDefaultAsync(r => r.Id == reservaId && r.CondominioId == condominioId, ct);

        if (reserva == null) return null;

        if (!isSindico && reserva.UsuarioId != usuarioId) return null;

        var solicitante = await _usuarioRepository.GetByIdAsync(reserva.UsuarioId, ct);
        var aprovador = reserva.AprovadorId.HasValue ? await _usuarioRepository.GetByIdAsync(reserva.AprovadorId.Value, ct) : null;

        return new ReservaDto
        {
            Id = reserva.Id,
            CondominioId = reserva.CondominioId,
            UnidadeId = reserva.UnidadeId,
            NomeUnidade = reserva.Unidade?.Nome,
            UsuarioId = reserva.UsuarioId,
            NomeUsuarioSolicitante = solicitante?.Nome,
            EspacoComumId = reserva.EspacoComumId,
            NomeEspacoComum = reserva.EspacoComum?.Nome,
            Inicio = reserva.Inicio,
            Fim = reserva.Fim,
            Status = reserva.Status.ToString(),
            DataSolicitacao = reserva.CreatedAt,
            TaxaCobrada = reserva.Taxa,
            Observacoes = reserva.Observacoes,
            AprovadorId = reserva.AprovadorId,
            NomeAprovador = aprovador?.Nome,
            JustificativaAprovacaoRecusa = reserva.JustificativaAprovacaoRecusa,
            UpdatedAt = reserva.UpdatedAt
        };
    }

    public async Task<bool> CancelarAsync(Guid reservaId, Guid condominioId, Guid usuarioId, bool isSindico, CancellationToken ct = default)
    {
        var reserva = await _reservaRepository.Query()
            .Include(r => r.EspacoComum)
            .FirstOrDefaultAsync(r => r.Id == reservaId && r.CondominioId == condominioId, ct);

        if (reserva == null) throw new KeyNotFoundException("Reserva não encontrada.");

        if (!isSindico && reserva.UsuarioId != usuarioId)
            throw new UnauthorizedAccessException("Usuário não autorizado a cancelar esta reserva.");

        if (!isSindico && reserva.EspacoComum?.AntecedenciaMinimaCancelamentoHoras.HasValue)
        {
            if (DateTime.UtcNow.AddHours(reserva.EspacoComum.AntecedenciaMinimaCancelamentoHoras.Value) > reserva.Inicio)
            {
                throw new InvalidOperationException($"Cancelamento não permitido. É necessário cancelar com pelo menos {reserva.EspacoComum.AntecedenciaMinimaCancelamentoHoras} horas de antecedência.");
            }
        }

        reserva.Status = isSindico ? ReservaStatus.CanceladaPeloSindico : ReservaStatus.CanceladaPeloUsuario;
        reserva.UpdatedAt = DateTime.UtcNow;
        // if(isSindico && string.IsNullOrEmpty(reserva.JustificativaAprovacaoRecusa)){
        //     reserva.JustificativaAprovacaoRecusa = "Cancelado pelo síndico.";
        // }

        await _reservaRepository.UpdateAsync(reserva, ct);
        await _reservaRepository.SaveChangesAsync(ct);
        return true;
    }

    public async Task<PaginatedResultDto<ReservaDto>> ListarTodasReservasAsync(Guid condominioId, ReservaFilterDto filters, CancellationToken ct = default)
    {
        var query = _reservaRepository.Query()
            .Where(r => r.CondominioId == condominioId);

        if (filters.EspacoComumId.HasValue)
        {
            query = query.Where(r => r.EspacoComumId == filters.EspacoComumId.Value);
        }
        if (filters.UnidadeId.HasValue)
        {
            query = query.Where(r => r.UnidadeId == filters.UnidadeId.Value);
        }
        if (!string.IsNullOrEmpty(filters.Status) && Enum.TryParse<ReservaStatus>(filters.Status, true, out var statusEnum))
        {
            query = query.Where(r => r.Status == statusEnum);
        }
        if (filters.PeriodoInicio.HasValue)
        {
            query = query.Where(r => r.Fim >= filters.PeriodoInicio.Value);
        }
        if (filters.PeriodoFim.HasValue)
        {
            DateTime fimDoDiaPeriodoFim = filters.PeriodoFim.Value.Date.AddDays(1).AddTicks(-1);
            query = query.Where(r => r.Inicio <= fimDoDiaPeriodoFim);
        }

        var totalItems = await query.CountAsync(ct);

        var reservas = await query
            .Include(r => r.EspacoComum)
            .Include(r => r.Unidade)
            .OrderByDescending(r => r.Inicio)
            .Skip((filters.PageNumber - 1) * filters.PageSize)
            .Take(filters.PageSize)
            .ToListAsync(ct);

        var reservaDtos = new List<ReservaDto>();
        foreach (var r in reservas)
        {
            var solicitante = await _usuarioRepository.GetByIdAsync(r.UsuarioId, ct);
            var aprovador = r.AprovadorId.HasValue ? await _usuarioRepository.GetByIdAsync(r.AprovadorId.Value, ct) : null;

            reservaDtos.Add(new ReservaDto
            {
                Id = r.Id,
                CondominioId = r.CondominioId,
                UnidadeId = r.UnidadeId,
                NomeUnidade = r.Unidade?.Nome,
                UsuarioId = r.UsuarioId,
                NomeUsuarioSolicitante = solicitante?.Nome,
                EspacoComumId = r.EspacoComumId,
                NomeEspacoComum = r.EspacoComum?.Nome,
                Inicio = r.Inicio,
                Fim = r.Fim,
                Status = r.Status.ToString(),
                DataSolicitacao = r.CreatedAt,
                TaxaCobrada = r.Taxa,
                Observacoes = r.Observacoes,
                AprovadorId = r.AprovadorId,
                NomeAprovador = aprovador?.Nome,
                JustificativaAprovacaoRecusa = r.JustificativaAprovacaoRecusa,
                UpdatedAt = r.UpdatedAt
            });
        }

        return new PaginatedResultDto<ReservaDto>(reservaDtos, totalItems, filters.PageNumber, filters.PageSize);
    }

    public async Task<List<ReservaDto>> ListarMinhasReservasAsync(Guid condominioId, Guid usuarioId, CancellationToken ct = default)
    {
        var query = _reservaRepository.Query()
            .Where(r => r.CondominioId == condominioId && r.UsuarioId == usuarioId);

        var reservas = await query
            .Include(r => r.EspacoComum)
            .Include(r => r.Unidade)
            .OrderByDescending(r => r.Inicio)
            .ToListAsync(ct);

        var reservaDtos = new List<ReservaDto>();
        foreach (var r in reservas)
        {
             var aprovador = r.AprovadorId.HasValue ? await _usuarioRepository.GetByIdAsync(r.AprovadorId.Value, ct) : null;
            var solicitante = await _usuarioRepository.GetByIdAsync(r.UsuarioId, ct); // Solicitante é o próprio usuário

            reservaDtos.Add(new ReservaDto
            {
                Id = r.Id,
                CondominioId = r.CondominioId,
                UnidadeId = r.UnidadeId,
                NomeUnidade = r.Unidade?.Nome,
                UsuarioId = r.UsuarioId,
                NomeUsuarioSolicitante = solicitante?.Nome,
                EspacoComumId = r.EspacoComumId,
                NomeEspacoComum = r.EspacoComum?.Nome,
                Inicio = r.Inicio,
                Fim = r.Fim,
                Status = r.Status.ToString(),
                DataSolicitacao = r.CreatedAt,
                TaxaCobrada = r.Taxa,
                Observacoes = r.Observacoes,
                AprovadorId = r.AprovadorId,
                NomeAprovador = aprovador?.Nome,
                JustificativaAprovacaoRecusa = r.JustificativaAprovacaoRecusa,
                UpdatedAt = r.UpdatedAt
            });
        }
        return reservaDtos;
    }

    public async Task<ReservaDto?> EditarReservaAsync(Guid reservaId, Guid condominioId, Guid sindicoUserId, ReservaInputDto dto, CancellationToken ct = default)
    {
        var reserva = await _reservaRepository.Query()
            .Include(r => r.EspacoComum)
            .FirstOrDefaultAsync(r => r.Id == reservaId && r.CondominioId == condominioId, ct);

        if (reserva == null)
        {
            throw new KeyNotFoundException("Reserva não encontrada.");
        }

        var espacoComumOriginal = reserva.EspacoComum;
        var espacoComumParaValidacao = espacoComumOriginal;

        if (dto.EspacoComumId != reserva.EspacoComumId)
        {
            espacoComumParaValidacao = await _espacoComumRepository.GetByIdAsync(dto.EspacoComumId, ct);
            if (espacoComumParaValidacao == null || espacoComumParaValidacao.CondominioId != condominioId)
            {
                throw new ArgumentException("Novo espaço comum inválido ou não pertence ao condomínio.");
            }
        }

        if (espacoComumParaValidacao == null) throw new ArgumentException("Espaço comum da reserva não pôde ser determinado para validação.");

        // Revalidar Regras do Espaço Comum (usando espacoComumParaValidacao)
        if (TimeSpan.TryParse(espacoComumParaValidacao.HorarioFuncionamentoInicio, out var inicioFuncionamento) &&
            TimeSpan.TryParse(espacoComumParaValidacao.HorarioFuncionamentoFim, out var fimFuncionamento))
        {
            if (dto.Inicio.TimeOfDay < inicioFuncionamento || dto.Fim.TimeOfDay > fimFuncionamento || dto.Inicio.TimeOfDay >= fimFuncionamento)
            {
                throw new InvalidOperationException($"O novo horário solicitado está fora do período de funcionamento do espaço ({espacoComumParaValidacao.HorarioFuncionamentoInicio} - {espacoComumParaValidacao.HorarioFuncionamentoFim}).");
            }
        }

        var duracaoReservaMinutos = (dto.Fim - dto.Inicio).TotalMinutes;
        if (espacoComumParaValidacao.TempoMinimoReservaMinutos.HasValue && duracaoReservaMinutos < espacoComumParaValidacao.TempoMinimoReservaMinutos.Value)
        {
            throw new InvalidOperationException($"A duração mínima da reserva para este espaço é de {espacoComumParaValidacao.TempoMinimoReservaMinutos} minutos.");
        }
        if (espacoComumParaValidacao.TempoMaximoReservaMinutos.HasValue && duracaoReservaMinutos > espacoComumParaValidacao.TempoMaximoReservaMinutos.Value)
        {
            throw new InvalidOperationException($"A duração máxima da reserva para este espaço é de {espacoComumParaValidacao.TempoMaximoReservaMinutos} minutos.");
        }

        // Não permitir editar para o passado se a data de início for alterada para antes de agora.
        // Se a data de início não mudou, mas o horário sim, e o dia é hoje, ainda precisa ser no futuro.
        if (dto.Inicio < DateTime.UtcNow)
        {
             throw new InvalidOperationException("Não é possível editar a reserva para uma data ou horário no passado.");
        }
        // Antecedência máxima só se aplica se a data de início for *alterada* para mais longe no futuro.
        if (dto.Inicio.Date > reserva.Inicio.Date && espacoComumParaValidacao.AntecedenciaMaximaReservaDias.HasValue && dto.Inicio.Date > DateTime.UtcNow.Date.AddDays(espacoComumParaValidacao.AntecedenciaMaximaReservaDias.Value))
        {
             throw new InvalidOperationException($"Não é possível reagendar com mais de {espacoComumParaValidacao.AntecedenciaMaximaReservaDias} dias de antecedência.");
        }

        // Validação de Conflito de Horário (excluindo a própria reserva sendo editada)
        bool hasConflict = await _reservaRepository.Query()
            .AnyAsync(r => r.Id != reservaId &&
                           r.EspacoComumId == dto.EspacoComumId && // Conflito no mesmo espaço (novo ou o mesmo)
                           r.Status != ReservaStatus.CanceladaPeloSindico && r.Status != ReservaStatus.CanceladaPeloUsuario && r.Status != ReservaStatus.Recusada &&
                           ((dto.Inicio >= r.Inicio && dto.Inicio < r.Fim) ||
                            (dto.Fim > r.Inicio && dto.Fim <= r.Fim) ||
                            (dto.Inicio <= r.Inicio && dto.Fim >= r.Fim))),
                           ct);

        if (hasConflict)
        {
            throw new InvalidOperationException("Conflito de horário com outra reserva existente para o novo período/espaço solicitado.");
        }

        // Atualizar os campos da reserva
        reserva.EspacoComumId = dto.EspacoComumId;
        reserva.Inicio = dto.Inicio;
        reserva.Fim = dto.Fim;
        reserva.Observacoes = dto.Observacoes;
        // Se o UnidadeId foi fornecido no DTO de edição (pelo síndico)
        if(dto.UnidadeId.HasValue && dto.UnidadeId.Value != Guid.Empty) {
            var unidadeParaEdicao = await _unidadeRepository.GetByIdAsync(dto.UnidadeId.Value, ct);
            if(unidadeParaEdicao == null || unidadeParaEdicao.CondominioId != condominioId) {
                throw new ArgumentException("Unidade especificada para edição é inválida.");
            }
            reserva.UnidadeId = dto.UnidadeId.Value;
            // Se a unidade muda, o UsuarioId original da reserva (solicitante) deve ser mantido ou atualizado?
            // Por ora, mantemos o UsuarioId original, assumindo que o síndico está editando em nome da unidade/usuário.
        }

        // Atualizar taxa se o espaço mudou ou se a taxa do espaço mudou
        if (reserva.EspacoComumId != espacoComumParaValidacao.Id || reserva.Taxa != espacoComumParaValidacao.TaxaReserva) {
             reserva.Taxa = espacoComumParaValidacao.TaxaReserva;
        }

        reserva.UpdatedAt = DateTime.UtcNow;
        // reserva.AprovadorId = sindicoUserId; // A edição pelo síndico pode ser considerada uma forma de "re-aprovação"

        await _reservaRepository.UpdateAsync(reserva, ct);
        await _reservaRepository.SaveChangesAsync(ct);

        return await GetByIdAsync(reservaId, condominioId, sindicoUserId, true, ct);
    }


    // Métodos CRUD para EspacoComum (para Síndico)
    public async Task<EspacoComumDto?> GetEspacoComumByIdAsync(Guid espacoId, Guid condominioId, CancellationToken ct = default)
    {
        var espaco = await _espacoComumRepository.Query()
            .FirstOrDefaultAsync(e => e.Id == espacoId && e.CondominioId == condominioId, ct);

        if (espaco == null) return null;

        return new EspacoComumDto
        {
            Id = espaco.Id,
            Nome = espaco.Nome,
            Descricao = espaco.Descricao,
            Capacidade = espaco.Capacidade,
            TaxaReserva = espaco.TaxaReserva,
            HorarioFuncionamentoInicio = espaco.HorarioFuncionamentoInicio,
            HorarioFuncionamentoFim = espaco.HorarioFuncionamentoFim,
            TempoMinimoReservaMinutos = espaco.TempoMinimoReservaMinutos,
            TempoMaximoReservaMinutos = espaco.TempoMaximoReservaMinutos,
            AntecedenciaMaximaReservaDias = espaco.AntecedenciaMaximaReservaDias,
            AntecedenciaMinimaCancelamentoHoras = espaco.AntecedenciaMinimaCancelamentoHoras,
            LimiteReservasPorUnidadeMes = espaco.LimiteReservasPorUnidadeMes,
            RequerAprovacaoSindico = espaco.RequerAprovacaoSindico,
            ExibirNoMural = espaco.ExibirNoMural
        };
    }

    public async Task<EspacoComumDto?> CriarEspacoComumAsync(Guid condominioId, EspacoComumDto dto, CancellationToken ct = default)
    {
        bool nomeEmUso = await _espacoComumRepository.Query()
            .AnyAsync(e => e.CondominioId == condominioId && e.Nome.ToLower() == dto.Nome.ToLower(), ct);
        if (nomeEmUso)
        {
            throw new InvalidOperationException($"Já existe um espaço comum com o nome '{dto.Nome}' neste condomínio.");
        }

        var espaco = new EspacoComum
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
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _espacoComumRepository.AddAsync(espaco, ct);
        await _espacoComumRepository.SaveChangesAsync(ct);

        dto.Id = espaco.Id;
        return dto;
    }

    public async Task<EspacoComumDto?> AtualizarEspacoComumAsync(Guid espacoId, Guid condominioId, EspacoComumDto dto, CancellationToken ct = default)
    {
        var espaco = await _espacoComumRepository.Query()
            .FirstOrDefaultAsync(e => e.Id == espacoId && e.CondominioId == condominioId, ct);

        if (espaco == null) throw new KeyNotFoundException("Espaço comum não encontrado.");

        if (espaco.Nome.ToLower() != dto.Nome.ToLower())
        {
            bool nomeEmUso = await _espacoComumRepository.Query()
                .AnyAsync(e => e.CondominioId == condominioId && e.Id != espacoId && e.Nome.ToLower() == dto.Nome.ToLower(), ct);
            if (nomeEmUso)
            {
                throw new InvalidOperationException($"Já existe outro espaço comum com o nome '{dto.Nome}' neste condomínio.");
            }
        }

        espaco.Nome = dto.Nome;
        espaco.Descricao = dto.Descricao;
        espaco.Capacidade = dto.Capacidade;
        espaco.TaxaReserva = dto.TaxaReserva;
        espaco.HorarioFuncionamentoInicio = dto.HorarioFuncionamentoInicio;
        espaco.HorarioFuncionamentoFim = dto.HorarioFuncionamentoFim;
        espaco.TempoMinimoReservaMinutos = dto.TempoMinimoReservaMinutos;
        espaco.TempoMaximoReservaMinutos = dto.TempoMaximoReservaMinutos;
        espaco.AntecedenciaMaximaReservaDias = dto.AntecedenciaMaximaReservaDias;
        espaco.AntecedenciaMinimaCancelamentoHoras = dto.AntecedenciaMinimaCancelamentoHoras;
        espaco.LimiteReservasPorUnidadeMes = dto.LimiteReservasPorUnidadeMes;
        espaco.RequerAprovacaoSindico = dto.RequerAprovacaoSindico;
        espaco.ExibirNoMural = dto.ExibirNoMural;
        espaco.UpdatedAt = DateTime.UtcNow;

        await _espacoComumRepository.UpdateAsync(espaco, ct);
        await _espacoComumRepository.SaveChangesAsync(ct);

        dto.Id = espaco.Id;
        return dto;
    }

    public async Task<bool> ExcluirEspacoComumAsync(Guid espacoId, Guid condominioId, CancellationToken ct = default)
    {
        var espaco = await _espacoComumRepository.Query()
            .Include(e => e.Reservas)
            .FirstOrDefaultAsync(e => e.Id == espacoId && e.CondominioId == condominioId, ct);

        if (espaco == null) throw new KeyNotFoundException("Espaço comum não encontrado.");

        if (espaco.Reservas != null && espaco.Reservas.Any(r => r.Inicio >= DateTime.UtcNow &&
            (r.Status == ReservaStatus.Confirmada || r.Status == ReservaStatus.Pendente)))
        {
            throw new InvalidOperationException("Não é possível excluir o espaço comum pois existem reservas futuras ou pendentes associadas a ele.");
        }

        await _espacoComumRepository.DeleteAsync(espaco, ct);
        await _espacoComumRepository.SaveChangesAsync(ct);
        return true;
    }
}

[end of conViver.Application/Services/ReservaService.cs]
