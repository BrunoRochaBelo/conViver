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

    public async Task<IEnumerable<EspacoComumDto>> ListarEspacosComunsAsync(
        Guid condominioId,
        CancellationToken ct = default)
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
            })
            .ToListAsync(ct);
    }

    public async Task<IEnumerable<AgendaReservaDto>> GetAgendaAsync(
        Guid condominioId,
        DateTime mesAno,
        Guid usuarioLogadoId,
        CancellationToken ct = default)
    {
        var inicioMes = new DateTime(mesAno.Year, mesAno.Month, 1);
        var fimMes = inicioMes.AddMonths(1).AddMilliseconds(-1);

        var reservasNoMes = await _reservaRepository.Query()
            .Include(r => r.EspacoComum)
            .Include(r => r.Unidade)
            .Where(r =>
                r.EspacoComum != null &&
                r.EspacoComum.CondominioId == condominioId &&
                r.Inicio <= fimMes &&
                r.Fim >= inicioMes &&
                r.Status != ReservaStatus.Recusada &&
                r.Status != ReservaStatus.CanceladaPeloUsuario &&
                r.Status != ReservaStatus.CanceladaPeloSindico)
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
            NomeUnidade = r.Unidade?.Identificacao,
            TituloReserva = $"{r.EspacoComum?.Nome} - " +
                $"{(r.Unidade?.Identificacao ?? $"Unid. {r.UnidadeId.ToString()[..4]}")}",
            PertenceAoUsuarioLogado = r.UsuarioId == usuarioLogadoId
        });
    }

    public async Task<ReservaDto?> SolicitarAsync(
        Guid condominioId,
        Guid usuarioId,
        ReservaInputDto dto,
        CancellationToken ct = default)
    {
        // validando espaço
        var espaco = await _espacoComumRepository.GetByIdAsync(dto.EspacoComumId, ct);
        if (espaco == null || espaco.CondominioId != condominioId)
            throw new ArgumentException("Espaço comum inválido ou não pertence ao condomínio.");

        // validando usuário
        var usuario = await _usuarioRepository.GetByIdAsync(usuarioId, ct);
        if (usuario == null)
            throw new ArgumentException("Usuário solicitante não encontrado.");

        // definindo unidade
        Guid unidadeParaReserva;
        if (dto.UnidadeId.HasValue && dto.UnidadeId.Value != Guid.Empty)
        {
            var unid = await _unidadeRepository.GetByIdAsync(dto.UnidadeId.Value, ct);
            if (unid == null || unid.CondominioId != condominioId)
                throw new ArgumentException("Unidade inválida ou fora do condomínio.");

            unidadeParaReserva = unid.Id;
        }
        else
        {
            unidadeParaReserva = usuario.UnidadeId;
        }

        // validação básica de datas
        if (dto.Fim <= dto.Inicio)
            throw new ArgumentException("Data/hora de término deve ser posterior ao início.");
        if (dto.Inicio < DateTime.UtcNow)
            throw new InvalidOperationException("Não é possível reservar em data/hora passada.");

        // horário de funcionamento
        if (TimeSpan.TryParse(espaco.HorarioFuncionamentoInicio, out var iniFunc) &&
            TimeSpan.TryParse(espaco.HorarioFuncionamentoFim, out var fimFunc))
        {
            var inicioDay = dto.Inicio.TimeOfDay;
            var fimDay = dto.Fim.TimeOfDay;
            if (inicioDay < iniFunc || fimDay > fimFunc || inicioDay >= fimFunc)
                throw new InvalidOperationException(
                    $"Fora do horário ({espaco.HorarioFuncionamentoInicio}–{espaco.HorarioFuncionamentoFim}).");
        }

        // duração mínima/máxima
        var duracao = (dto.Fim - dto.Inicio).TotalMinutes;
        if (espaco.TempoMinimoReservaMinutos.HasValue
            && duracao < espaco.TempoMinimoReservaMinutos.Value)
            throw new InvalidOperationException(
                $"Duração mínima de {espaco.TempoMinimoReservaMinutos.Value} minutos.");
        if (espaco.TempoMaximoReservaMinutos.HasValue
            && duracao > espaco.TempoMaximoReservaMinutos.Value)
            throw new InvalidOperationException(
                $"Duração máxima de {espaco.TempoMaximoReservaMinutos.Value} minutos.");

        // antecedência máxima
        if (espaco.AntecedenciaMaximaReservaDias.HasValue
            && dto.Inicio.Date > DateTime.UtcNow.Date
                .AddDays(espaco.AntecedenciaMaximaReservaDias.Value))
            throw new InvalidOperationException(
                $"Não é possível reservar com mais de " +
                $"{espaco.AntecedenciaMaximaReservaDias.Value} dias de antecedência.");

        // limite mensal por unidade
        if (espaco.LimiteReservasPorUnidadeMes.HasValue
            && espaco.LimiteReservasPorUnidadeMes.Value > 0)
        {
            var inicioDoMes = new DateTime(dto.Inicio.Year, dto.Inicio.Month, 1);
            var fimDoMes = inicioDoMes.AddMonths(1).AddMilliseconds(-1);

            var qtd = await _reservaRepository.Query()
                .CountAsync(r =>
                    r.EspacoComumId == dto.EspacoComumId
                    && r.UnidadeId == unidadeParaReserva
                    && r.Inicio >= inicioDoMes
                    && r.Inicio <= fimDoMes
                    && (r.Status == ReservaStatus.Confirmada
                        || r.Status == ReservaStatus.Pendente),
                    ct);

            if (qtd >= espaco.LimiteReservasPorUnidadeMes.Value)
                throw new InvalidOperationException(
                    $"Limite de {espaco.LimiteReservasPorUnidadeMes.Value} " +
                    "reservas/mês atingido.");
        }

        // conflito de horários
            var conflito = await _reservaRepository.Query()
                .AnyAsync(r =>
                    r.EspacoComumId == dto.EspacoComumId
                    && r.Status != ReservaStatus.Recusada
                    && r.Status != ReservaStatus.CanceladaPeloUsuario
                    && r.Status != ReservaStatus.CanceladaPeloSindico
                    // overlap: início < fimExistente && inícioExistente < fim
                    && dto.Inicio < r.Fim
                    && r.Inicio < dto.Fim,
                ct);


        if (conflito)
            throw new InvalidOperationException(
                "Conflito de horário com outra reserva existente.");

        // criação da reserva
        var reserva = new Reserva
        {
            Id = Guid.NewGuid(),
            CondominioId = condominioId,
            UnidadeId = unidadeParaReserva,
            UsuarioId = usuarioId,
            EspacoComumId = dto.EspacoComumId,
            Inicio = dto.Inicio,
            Fim = dto.Fim,
            Observacoes = dto.Observacoes,
            Status = espaco.RequerAprovacaoSindico
                ? ReservaStatus.Pendente
                : ReservaStatus.Confirmada,
            Taxa = espaco.TaxaReserva,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _reservaRepository.AddAsync(reserva, ct);
        await _reservaRepository.SaveChangesAsync(ct);

        return await GetByIdAsync(reserva.Id, condominioId, usuarioId, false, ct);
    }

    public async Task<ReservaDto?> AtualizarStatusAsync(
        Guid reservaId,
        Guid condominioId,
        Guid sindicoUserId,
        ReservaStatusUpdateDto dto,
        CancellationToken ct = default)
    {
        var reserva = await _reservaRepository.Query()
            .FirstOrDefaultAsync(r =>
                r.Id == reservaId && r.CondominioId == condominioId,
                ct);
        if (reserva == null)
            throw new KeyNotFoundException("Reserva não encontrada.");

        if (!Enum.TryParse<ReservaStatus>(dto.Status, true, out var novoStatus))
            throw new ArgumentException("Status inválido.");

        if ((reserva.Status == ReservaStatus.CanceladaPeloUsuario
             || reserva.Status == ReservaStatus.CanceladaPeloSindico)
            && novoStatus != reserva.Status)
        {
            throw new InvalidOperationException(
                "Não é possível alterar status de reserva já cancelada.");
        }

        reserva.Status = novoStatus;
        reserva.JustificativaAprovacaoRecusa = dto.Justificativa;
        reserva.AprovadorId = sindicoUserId;
        reserva.UpdatedAt = DateTime.UtcNow;

        await _reservaRepository.UpdateAsync(reserva, ct);
        await _reservaRepository.SaveChangesAsync(ct);

        return await GetByIdAsync(reservaId, condominioId, sindicoUserId, true, ct);
    }

    public async Task<ReservaDto?> GetByIdAsync(
        Guid reservaId,
        Guid condominioId,
        Guid usuarioId,
        bool isSindico,
        CancellationToken ct = default)
    {
        var reserva = await _reservaRepository.Query()
            .Include(r => r.EspacoComum)
            .Include(r => r.Unidade)
            .FirstOrDefaultAsync(r =>
                r.Id == reservaId && r.CondominioId == condominioId,
                ct);
        if (reserva == null) return null;
        if (!isSindico && reserva.UsuarioId != usuarioId) return null;

        var solicitante = await _usuarioRepository.GetByIdAsync(reserva.UsuarioId, ct);
        var aprovador = reserva.AprovadorId.HasValue
            ? await _usuarioRepository.GetByIdAsync(reserva.AprovadorId.Value, ct)
            : null;

        return new ReservaDto
        {
            Id = reserva.Id,
            CondominioId = reserva.CondominioId,
            UnidadeId = reserva.UnidadeId,
            NomeUnidade = reserva.Unidade?.Identificacao,
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

    public async Task<bool> CancelarAsync(
        Guid reservaId,
        Guid condominioId,
        Guid usuarioId,
        bool isSindico,
        CancellationToken ct = default)
    {
        var reserva = await _reservaRepository.Query()
            .Include(r => r.EspacoComum)
            .FirstOrDefaultAsync(r =>
                r.Id == reservaId && r.CondominioId == condominioId,
                ct);
        if (reserva == null)
            throw new KeyNotFoundException("Reserva não encontrada.");

        if (!isSindico && reserva.UsuarioId != usuarioId)
            throw new UnauthorizedAccessException(
                "Usuário não autorizado a cancelar esta reserva.");

        if (!isSindico
            && reserva.EspacoComum?.AntecedenciaMinimaCancelamentoHoras.HasValue == true)
        {
            var horas = reserva.EspacoComum.AntecedenciaMinimaCancelamentoHoras.Value;
            if (DateTime.UtcNow.AddHours(horas) > reserva.Inicio)
                throw new InvalidOperationException(
                    $"Cancelamento exige ao menos {horas}h de antecedência.");
        }

        reserva.Status = isSindico
            ? ReservaStatus.CanceladaPeloSindico
            : ReservaStatus.CanceladaPeloUsuario;
        reserva.UpdatedAt = DateTime.UtcNow;

        await _reservaRepository.UpdateAsync(reserva, ct);
        await _reservaRepository.SaveChangesAsync(ct);
        return true;
    }

    public async Task<ReservaDto?> EditarReservaAsync(
        Guid reservaId,
        Guid condominioId,
        Guid sindicoUserId,
        ReservaInputDto dto,
        CancellationToken ct = default)
    {
        var reserva = await _reservaRepository.Query()
            .FirstOrDefaultAsync(r => r.Id == reservaId && r.CondominioId == condominioId, ct);
        if (reserva == null)
            throw new KeyNotFoundException("Reserva não encontrada.");

        // Atualiza informações básicas. Validações mais complexas podem ser adicionadas conforme necessário.
        reserva.Inicio = dto.Inicio;
        reserva.Fim = dto.Fim;
        reserva.Observacoes = dto.Observacoes;
        reserva.UpdatedAt = DateTime.UtcNow;
        reserva.AprovadorId = sindicoUserId;

        await _reservaRepository.UpdateAsync(reserva, ct);
        await _reservaRepository.SaveChangesAsync(ct);

        return await GetByIdAsync(reservaId, condominioId, sindicoUserId, true, ct);
    }

    public async Task<PaginatedResultDto<ReservaDto>> ListarTodasReservasAsync(
        Guid condominioId,
        ReservaFilterDto filters,
        CancellationToken ct = default)
    {
        var query = _reservaRepository.Query()
            .Where(r => r.CondominioId == condominioId);

        if (filters.EspacoComumId.HasValue)
            query = query.Where(r => r.EspacoComumId == filters.EspacoComumId.Value);
        if (filters.UnidadeId.HasValue)
            query = query.Where(r => r.UnidadeId == filters.UnidadeId.Value);
        if (!string.IsNullOrEmpty(filters.Status)
            && Enum.TryParse<ReservaStatus>(filters.Status, true, out var st))
            query = query.Where(r => r.Status == st);
        if (filters.PeriodoInicio.HasValue)
            query = query.Where(r => r.Fim >= filters.PeriodoInicio.Value);
        if (filters.PeriodoFim.HasValue)
        {
            var fimDia = filters.PeriodoFim.Value.Date.AddDays(1).AddTicks(-1);
            query = query.Where(r => r.Inicio <= fimDia);
        }

        var total = await query.CountAsync(ct);

        var lista = await query
            .Include(r => r.EspacoComum)
            .Include(r => r.Unidade)
            .OrderByDescending(r => r.Inicio)
            .Skip((filters.PageNumber - 1) * filters.PageSize)
            .Take(filters.PageSize)
            .ToListAsync(ct);

        var dtos = new List<ReservaDto>(lista.Count);
        foreach (var r in lista)
        {
            var sol = await _usuarioRepository.GetByIdAsync(r.UsuarioId, ct);
            var apr = r.AprovadorId.HasValue
                ? await _usuarioRepository.GetByIdAsync(r.AprovadorId.Value, ct)
                : null;

            dtos.Add(new ReservaDto
            {
                Id = r.Id,
                CondominioId = r.CondominioId,
                UnidadeId = r.UnidadeId,
                NomeUnidade = r.Unidade?.Identificacao,
                UsuarioId = r.UsuarioId,
                NomeUsuarioSolicitante = sol?.Nome,
                EspacoComumId = r.EspacoComumId,
                NomeEspacoComum = r.EspacoComum?.Nome,
                Inicio = r.Inicio,
                Fim = r.Fim,
                Status = r.Status.ToString(),
                DataSolicitacao = r.CreatedAt,
                TaxaCobrada = r.Taxa,
                Observacoes = r.Observacoes,
                AprovadorId = r.AprovadorId,
                NomeAprovador = apr?.Nome,
                JustificativaAprovacaoRecusa = r.JustificativaAprovacaoRecusa,
                UpdatedAt = r.UpdatedAt
            });
        }

        return new PaginatedResultDto<ReservaDto>(
            dtos, total, filters.PageNumber, filters.PageSize);
    }

    public async Task<List<ReservaDto>> ListarMinhasReservasAsync(
        Guid condominioId,
        Guid usuarioId,
        CancellationToken ct = default)
    {
        var reservas = await _reservaRepository.Query()
            .Where(r => r.CondominioId == condominioId
                        && r.UsuarioId == usuarioId)
            .Include(r => r.EspacoComum)
            .Include(r => r.Unidade)
            .OrderByDescending(r => r.Inicio)
            .ToListAsync(ct);

        var dtos = new List<ReservaDto>(reservas.Count);
        foreach (var r in reservas)
        {
            var sol = await _usuarioRepository.GetByIdAsync(r.UsuarioId, ct);
            var apr = r.AprovadorId.HasValue
                ? await _usuarioRepository.GetByIdAsync(r.AprovadorId.Value, ct)
                : null;

            dtos.Add(new ReservaDto
            {
                Id = r.Id,
                CondominioId = r.CondominioId,
                UnidadeId = r.UnidadeId,
                NomeUnidade = r.Unidade?.Identificacao,
                UsuarioId = r.UsuarioId,
                NomeUsuarioSolicitante = sol?.Nome,
                EspacoComumId = r.EspacoComumId,
                NomeEspacoComum = r.EspacoComum?.Nome,
                Inicio = r.Inicio,
                Fim = r.Fim,
                Status = r.Status.ToString(),
                DataSolicitacao = r.CreatedAt,
                TaxaCobrada = r.Taxa,
                Observacoes = r.Observacoes,
                AprovadorId = r.AprovadorId,
                NomeAprovador = apr?.Nome,
                JustificativaAprovacaoRecusa = r.JustificativaAprovacaoRecusa,
                UpdatedAt = r.UpdatedAt
            });
        }

        return dtos;
    }

    // --- CRUD de Espaço Comum ---

    public async Task<EspacoComumDto?> GetEspacoComumByIdAsync(
        Guid espacoId,
        Guid condominioId,
        CancellationToken ct = default)
    {
        var e = await _espacoComumRepository.Query()
            .FirstOrDefaultAsync(x =>
                x.Id == espacoId && x.CondominioId == condominioId,
                ct);
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
            ExibirNoMural = e.ExibirNoMural
        };
    }

    public async Task<EspacoComumDto?> CriarEspacoComumAsync(
        Guid condominioId,
        EspacoComumDto dto,
        CancellationToken ct = default)
    {
        var exists = await _espacoComumRepository.Query()
            .AnyAsync(e =>
                e.CondominioId == condominioId &&
                e.Nome.ToLower() == dto.Nome.ToLower(),
                ct);
        if (exists)
            throw new InvalidOperationException(
                $"Já existe espaço com nome '{dto.Nome}'.");

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
            .FirstOrDefaultAsync(x =>
                x.Id == espacoId && x.CondominioId == condominioId,
                ct);
        if (e == null)
            throw new KeyNotFoundException("Espaço comum não encontrado.");

        if (!e.Nome.Equals(dto.Nome, StringComparison.OrdinalIgnoreCase))
        {
            var conflict = await _espacoComumRepository.Query()
                .AnyAsync(x =>
                    x.CondominioId == condominioId
                    && x.Id != espacoId
                    && x.Nome.ToLower() == dto.Nome.ToLower(),
                    ct);
            if (conflict)
                throw new InvalidOperationException(
                    $"Outro espaço já usa o nome '{dto.Nome}'.");
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
            .Include(x => x.Reservas)
            .FirstOrDefaultAsync(x =>
                x.Id == espacoId && x.CondominioId == condominioId,
                ct);
        if (e == null)
            throw new KeyNotFoundException("Espaço comum não encontrado.");

        if (e.Reservas?.Any(r =>
            r.Inicio >= DateTime.UtcNow &&
            (r.Status == ReservaStatus.Confirmada ||
             r.Status == ReservaStatus.Pendente)) == true)
        {
            throw new InvalidOperationException(
                "Existem reservas futuras/pendentes — não é possível excluir.");
        }

        await _espacoComumRepository.DeleteAsync(e, ct);
        await _espacoComumRepository.SaveChangesAsync(ct);
        return true;
    }
}
