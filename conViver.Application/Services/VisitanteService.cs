using conViver.Core.DTOs;
using conViver.Core.Entities;
using conViver.Core.Enums;
using conViver.Core.Interfaces;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;

namespace conViver.Application;

public class VisitanteService
{
    private readonly IRepository<Visitante> _visitanteRepository;
    private readonly IRepository<Unidade> _unidadeRepository; // Assuming you need to validate UnidadeId
    private readonly IUsuarioService _usuarioService; // Assuming you need to validate CondominoId
    private readonly INotificacaoService _notificacaoService;

    public VisitanteService(
        IRepository<Visitante> visitanteRepository,
        IRepository<Unidade> unidadeRepository, // Add this
        IUsuarioService usuarioService, // Add this
        INotificacaoService notificacaoService) // Add this
    {
        _visitanteRepository = visitanteRepository;
        _unidadeRepository = unidadeRepository;
        _usuarioService = usuarioService;
        _notificacaoService = notificacaoService;
    }

    // This method is replaced by ListarHistoricoVisitantesAsync
    // public Task<List<Visitante>> ListarAsync(DateTime? from = null, DateTime? to = null, CancellationToken ct = default)
    // {
    //     var query = _visitanteRepository.Query();
    //     if (from != null)
    //         query = query.Where(v => v.DataChegada >= from);
    //     if (to != null)
    //         query = query.Where(v => v.DataChegada <= to);
    //     return query.OrderByDescending(v => v.DataChegada).ToListAsync(ct);
    // }

    private static VisitanteDto MapToDto(Visitante v)
    {
        // 'v' is now expected to be non-null due to checks in calling methods.
        return new VisitanteDto
        {
            Id = v.Id,
            UnidadeId = v.UnidadeId,
            Nome = v.Nome,
            Documento = v.Documento,
            FotoUrl = v.FotoUrl,
            MotivoVisita = v.MotivoVisita,
            DataChegada = v.DataChegada,
            DataSaida = v.DataSaida,
            HorarioSaidaPrevisto = v.HorarioSaidaPrevisto,
            Observacoes = v.Observacoes,
            Status = v.Status,
            QRCode = v.QRCode,
            PreAutorizadoPorCondominoId = v.PreAutorizadoPorCondominoId,
            DataValidadePreAutorizacao = v.DataValidadePreAutorizacao,
            CreatedAt = v.CreatedAt,
            UpdatedAt = v.UpdatedAt
        };
    }

    public async Task<VisitanteDto?> ObterVisitantePorIdAsync(Guid visitanteId, CancellationToken ct = default)
    {
        var visitante = await _visitanteRepository.GetByIdAsync(visitanteId, ct);
        if (visitante == null)
        {
            return null;
        }
        return MapToDto(visitante); // 'visitante' is guaranteed non-null here.
    }

    public async Task<VisitanteDto> RegistrarEntradaAsync(VisitanteInputDto inputDto, Guid responsavelId, CancellationToken ct = default)
    {
        // Validate UnidadeId exists (optional, but good practice)
        var unidadeExists = await _unidadeRepository.Query().AnyAsync(u => u.Id == inputDto.UnidadeId, ct);
        if (!unidadeExists)
        {
            throw new ArgumentException($"Unidade com ID {inputDto.UnidadeId} não encontrada.", nameof(inputDto.UnidadeId));
        }

        var novoVisitante = new Visitante
        {
            Id = Guid.NewGuid(),
            UnidadeId = inputDto.UnidadeId,
            Nome = inputDto.Nome,
            Documento = inputDto.Documento,
            MotivoVisita = inputDto.MotivoVisita,
            HorarioSaidaPrevisto = inputDto.HorarioSaidaPrevisto,
            Observacoes = inputDto.Observacoes,
            DataChegada = DateTime.UtcNow, // System sets this
            Status = VisitanteStatus.Dentro, // System sets this
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
            // FotoUrl and QRCode would be handled by other specific methods if applicable at this stage
        };

        await _visitanteRepository.AddAsync(novoVisitante, ct);

        // TODO: Call _notificacaoService.NotificarChegadaVisitanteAsync(novoVisitante.UnidadeId, novoVisitante.Nome);

        // It's better to call ObterVisitantePorIdAsync to ensure consistent DTO mapping
        var visitanteDto = await ObterVisitantePorIdAsync(novoVisitante.Id, ct);
        if (visitanteDto == null)
        {
            // This case should ideally not happen if AddAsync was successful and GetByIdAsync is consistent.
            // Handle error appropriately, perhaps throw an exception.
            throw new InvalidOperationException("Falha ao obter o visitante recém-criado.");
        }
        return visitanteDto;
    }

    public async Task<VisitanteDto?> RegistrarSaidaAsync(Guid visitanteId, Guid responsavelId, CancellationToken ct = default)
    {
        var visitante = await _visitanteRepository.GetByIdAsync(visitanteId, ct);
        if (visitante == null)
        {
            // Or throw NotFoundException
            return null;
        }

        if (visitante.Status == VisitanteStatus.Saiu)
        {
            // Optional: throw new InvalidOperationException("Visitante já registrou saída.");
            // Or just return current state
        }

        visitante.DataSaida = DateTime.UtcNow;
        visitante.Status = VisitanteStatus.Saiu;
        visitante.UpdatedAt = DateTime.UtcNow;

        await _visitanteRepository.UpdateAsync(visitante, ct);

        // TODO: Optional: Call _notificacaoService for exit if needed

        return await ObterVisitantePorIdAsync(visitante.Id, ct);
    }

    public async Task<VisitanteDto?> AtualizarDadosVisitanteAsync(Guid visitanteId, VisitanteUpdateDto updateDto, Guid responsavelId, CancellationToken ct = default)
    {
        var visitante = await _visitanteRepository.GetByIdAsync(visitanteId, ct);
        if (visitante == null)
        {
            return null; // Or throw NotFoundException
        }

        // Update only provided fields
        visitante.Nome = !string.IsNullOrEmpty(updateDto.Nome) ? updateDto.Nome : visitante.Nome;
        visitante.Documento = updateDto.Documento ?? visitante.Documento; // Allow clearing document
        visitante.MotivoVisita = updateDto.MotivoVisita ?? visitante.MotivoVisita;
        visitante.HorarioSaidaPrevisto = updateDto.HorarioSaidaPrevisto ?? visitante.HorarioSaidaPrevisto;
        visitante.Observacoes = updateDto.Observacoes ?? visitante.Observacoes;

        if (updateDto.Status.HasValue) // Allow explicit status update if defined in DTO and business logic allows
        {
            visitante.Status = updateDto.Status.Value;
        }

        visitante.UpdatedAt = DateTime.UtcNow;

        await _visitanteRepository.UpdateAsync(visitante, ct);

        return await ObterVisitantePorIdAsync(visitante.Id, ct);
    }

    public async Task<IEnumerable<VisitanteDto>> ListarVisitantesAtuaisAsync(Guid? unidadeId = null, CancellationToken ct = default)
    {
        var query = _visitanteRepository.Query()
            .Where(v => v.Status == VisitanteStatus.Dentro);

        if (unidadeId.HasValue)
        {
            query = query.Where(v => v.UnidadeId == unidadeId.Value);
        }

        query = query.OrderByDescending(v => v.DataChegada);
        var visitantes = await query.ToListAsync(ct);
        return visitantes.Select(MapToDto).ToList();
    }

    public async Task<IEnumerable<VisitanteDto>> ListarVisitantesPorStatusAsync(VisitanteStatus status, Guid? unidadeId = null, CancellationToken ct = default)
    {
        var query = _visitanteRepository.Query()
            .Where(v => v.Status == status);

        if (unidadeId.HasValue)
        {
            query = query.Where(v => v.UnidadeId == unidadeId.Value);
        }

        query = query.OrderByDescending(v => v.DataChegada);
        var visitantes = await query.ToListAsync(ct);
        return visitantes.Select(MapToDto).ToList();
    }

    public async Task<IEnumerable<VisitanteDto>> ListarHistoricoVisitantesAsync(Guid? unidadeId = null, DateTime? inicio = null, DateTime? fim = null, string? nomeVisitante = null, CancellationToken ct = default)
    {
        var query = _visitanteRepository.Query();

        if (unidadeId.HasValue)
        {
            query = query.Where(v => v.UnidadeId == unidadeId.Value);
        }
        if (inicio.HasValue)
        {
            query = query.Where(v => v.DataChegada >= inicio.Value);
        }
        if (fim.HasValue)
        {
            query = query.Where(v => v.DataChegada < fim.Value.AddDays(1));
        }
        if (!string.IsNullOrWhiteSpace(nomeVisitante))
        {
            query = query.Where(v => v.Nome.Contains(nomeVisitante));
        }

        query = query.OrderByDescending(v => v.DataChegada);
        var visitantes = await query.ToListAsync(ct);
        return visitantes.Select(MapToDto).ToList();
    }

    public async Task<VisitanteDto> PreAutorizarVisitaAsync(PreAutorizacaoVisitanteDto preAuthDto, CancellationToken ct = default)
    {
        var unidadeExists = await _unidadeRepository.Query().AnyAsync(u => u.Id == preAuthDto.UnidadeId, ct);
        if (!unidadeExists)
        {
            throw new ArgumentException($"Unidade com ID {preAuthDto.UnidadeId} não encontrada.", nameof(preAuthDto.UnidadeId));
        }

        // var condomino = await _usuarioService.GetUsuarioByIdAsync(preAuthDto.CondominoId);
        // if (condomino == null)
        // {
        //     throw new ArgumentException($"Condômino com ID {preAuthDto.CondominoId} não encontrado ou inválido.", nameof(preAuthDto.CondominoId));
        // }

        var qrCodeValue = Guid.NewGuid().ToString("N");

        var novoVisitantePreAutorizado = new Visitante
        {
            Id = Guid.NewGuid(),
            UnidadeId = preAuthDto.UnidadeId,
            Nome = preAuthDto.NomeVisitante,
            Documento = preAuthDto.DocumentoVisitante,
            MotivoVisita = preAuthDto.MotivoVisita,
            DataChegada = preAuthDto.HorarioEntradaPrevisto ?? DateTime.UtcNow,
            HorarioSaidaPrevisto = preAuthDto.HorarioSaidaPrevisto,
            Status = VisitanteStatus.PreAutorizado,
            QRCode = qrCodeValue,
            PreAutorizadoPorCondominoId = preAuthDto.CondominoId,
            DataValidadePreAutorizacao = preAuthDto.DataValidadePreAutorizacao,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _visitanteRepository.AddAsync(novoVisitantePreAutorizado, ct);
        // TODO: Call _notificacaoService.NotificarVisitantePreAutorizadoAsync(novoVisitantePreAutorizado.UnidadeId, novoVisitantePreAutorizado.Nome, qrCodeValue);

        var resultDto = await ObterVisitantePorIdAsync(novoVisitantePreAutorizado.Id, ct);
        if (resultDto == null) throw new InvalidOperationException("Falha ao recuperar visitante pré-autorizado após criação.");
        return resultDto;
    }

    public async Task<VisitanteDto?> ValidarEntradaComQRCodeAsync(string qrCodeValue, Guid porteiroId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(qrCodeValue))
        {
            throw new ArgumentException("QR Code não pode ser vazio.", nameof(qrCodeValue));
        }

        var visitante = await _visitanteRepository.Query()
            .FirstOrDefaultAsync(v => v.QRCode == qrCodeValue && v.Status == VisitanteStatus.PreAutorizado, ct);

        if (visitante == null)
        {
            // TODO: Call _notificacaoService.NotificarFalhaQRCodeInvalidoAsync();
            return null;
        }

        if (visitante.DataValidadePreAutorizacao.HasValue && visitante.DataValidadePreAutorizacao.Value < DateTime.UtcNow)
        {
            // TODO: Call _notificacaoService.NotificarFalhaQRCodeExpiradoAsync(visitante.UnidadeId);
            visitante.Status = VisitanteStatus.Aguardando;
            await _visitanteRepository.UpdateAsync(visitante, ct);
            throw new InvalidOperationException("QR Code expirado.");
        }

        visitante.Status = VisitanteStatus.Dentro;
        visitante.DataChegada = DateTime.UtcNow;
        visitante.UpdatedAt = DateTime.UtcNow;

        await _visitanteRepository.UpdateAsync(visitante, ct);
        // TODO: Call _notificacaoService.NotificarChegadaVisitanteAsync(visitante.UnidadeId, visitante.Nome);

        return await ObterVisitantePorIdAsync(visitante.Id, ct);
    }
}
