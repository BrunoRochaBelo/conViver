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

public class ChamadoService
{
    private readonly IRepository<Chamado> _chamadoRepository;

    public ChamadoService(IRepository<Chamado> chamadoRepository)
    {
        _chamadoRepository = chamadoRepository;
    }

    public async Task<Chamado> AbrirChamadoAsync(Guid condominioId, Guid usuarioId, ChamadoInputDto input, CancellationToken ct = default)
    {
        var chamado = new Chamado
        {
            Id = Guid.NewGuid(),
            CondominioId = condominioId,
            UsuarioId = usuarioId,
            UnidadeId = input.UnidadeId,
            Titulo = input.Titulo,
            Descricao = input.Descricao,
            Fotos = input.Fotos ?? new List<string>(),
            Status = "Aberto", // Status inicial padrão
            DataAbertura = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _chamadoRepository.AddAsync(chamado, ct);
        await _chamadoRepository.SaveChangesAsync(ct);

        return chamado;
    }

    public async Task<IEnumerable<ChamadoDto>> ListarChamadosPorUsuarioAsync(Guid condominioId, Guid usuarioId, string? status, CancellationToken ct = default)
    {
        var query = _chamadoRepository.Query()
            .Where(c => c.CondominioId == condominioId && c.UsuarioId == usuarioId);

        if (!string.IsNullOrEmpty(status))
        {
            query = query.Where(c => c.Status == status);
        }

        return await query
            .OrderByDescending(c => c.DataAbertura)
            .Select(c => new ChamadoDto // Mapeamento manual
            {
                Id = c.Id,
                Titulo = c.Titulo,
                Descricao = c.Descricao,
                Fotos = c.Fotos,
                Status = c.Status,
                DataAbertura = c.DataAbertura,
                DataResolucao = c.DataResolucao,
                UsuarioId = c.UsuarioId,
                UnidadeId = c.UnidadeId,
                RespostaDoSindico = c.RespostaDoSindico,
                AvaliacaoNota = c.AvaliacaoNota,
                AvaliacaoComentario = c.AvaliacaoComentario
            })
            .ToListAsync(ct);
    }

    public async Task<IEnumerable<ChamadoDto>> ListarChamadosParaSindicoAsync(Guid condominioId, string? status, CancellationToken ct = default)
    {
        var query = _chamadoRepository.Query()
            .Where(c => c.CondominioId == condominioId);

        if (!string.IsNullOrEmpty(status))
        {
            query = query.Where(c => c.Status == status);
        }

        return await query
            .OrderByDescending(c => c.DataAbertura)
            .Select(c => new ChamadoDto // Mapeamento manual
            {
                Id = c.Id,
                Titulo = c.Titulo,
                Descricao = c.Descricao,
                Fotos = c.Fotos,
                Status = c.Status,
                DataAbertura = c.DataAbertura,
                DataResolucao = c.DataResolucao,
                UsuarioId = c.UsuarioId,
                UnidadeId = c.UnidadeId,
                RespostaDoSindico = c.RespostaDoSindico,
                AvaliacaoNota = c.AvaliacaoNota,
                AvaliacaoComentario = c.AvaliacaoComentario
            })
            .ToListAsync(ct);
    }

    // Método auxiliar para mapear Chamado para ChamadoDto, pode ser expandido ou substituído por AutoMapper
    public static ChamadoDto MapToChamadoDto(Chamado chamado)
    {
        return new ChamadoDto
        {
            Id = chamado.Id,
            Titulo = chamado.Titulo,
            Descricao = chamado.Descricao,
            Fotos = chamado.Fotos,
            Status = chamado.Status,
            DataAbertura = chamado.DataAbertura,
            DataResolucao = chamado.DataResolucao,
            UsuarioId = chamado.UsuarioId,
            UnidadeId = chamado.UnidadeId,
            RespostaDoSindico = chamado.RespostaDoSindico,
            AvaliacaoNota = chamado.AvaliacaoNota,
            AvaliacaoComentario = chamado.AvaliacaoComentario
        };
    }

    public async Task<ChamadoDto?> ObterChamadoPorIdAsync(Guid chamadoId, Guid condominioId, Guid usuarioId, bool isSindico, CancellationToken ct = default)
    {
        var chamado = await _chamadoRepository.Query()
            .FirstOrDefaultAsync(c => c.Id == chamadoId && c.CondominioId == condominioId, ct);

        if (chamado == null)
        {
            return null;
        }

        if (!isSindico && chamado.UsuarioId != usuarioId)
        {
            return null; // Condômino/Inquilino só pode ver seus próprios chamados.
        }

        return MapToChamadoDto(chamado);
    }

    public async Task<ChamadoDto?> AtualizarChamadoAsync(Guid chamadoId, Guid condominioId, Guid sindicoUserId, ChamadoUpdateDto updateDto, CancellationToken ct = default)
    {
        var chamado = await _chamadoRepository.Query()
            .FirstOrDefaultAsync(c => c.Id == chamadoId && c.CondominioId == condominioId, ct);

        if (chamado == null)
        {
            return null;
        }

        // Aqui poderiam entrar validações de transição de status mais complexas.
        // Por exemplo, não permitir ir de "Concluido" para "Aberto".
        // if (!IsValidStatusTransition(chamado.Status, updateDto.Status))
        // {
        //    throw new InvalidOperationException($"Não é possível mudar o status de {chamado.Status} para {updateDto.Status}.");
        // }

        chamado.Status = updateDto.Status;
        if (!string.IsNullOrWhiteSpace(updateDto.RespostaDoSindico)) // Só atualiza se fornecido
        {
            chamado.RespostaDoSindico = updateDto.RespostaDoSindico;
        }

        if ((updateDto.Status == "Concluido" || updateDto.Status == "Cancelado") && !chamado.DataResolucao.HasValue)
        {
            chamado.DataResolucao = DateTime.UtcNow;
        }

        chamado.UpdatedAt = DateTime.UtcNow;
        // Poderia haver um campo tipo "AtualizadoPorSindicoId = sindicoUserId"

        await _chamadoRepository.UpdateAsync(chamado, ct);
        await _chamadoRepository.SaveChangesAsync(ct);

        return MapToChamadoDto(chamado);
    }

    public async Task<ChamadoDto?> AvaliarChamadoAsync(Guid chamadoId, Guid condominioId, Guid usuarioId, ChamadoAvaliacaoDto avaliacaoDto, CancellationToken ct = default)
    {
        var chamado = await _chamadoRepository.Query()
            .FirstOrDefaultAsync(c => c.Id == chamadoId && c.CondominioId == condominioId && c.UsuarioId == usuarioId, ct);

        if (chamado == null)
        {
            // Chamado não encontrado ou não pertence ao usuário.
            return null;
        }

        // Regra de negócio: Só permite avaliação se o status for "Concluido".
        // Outros status como "Cancelado" podem ou não permitir avaliação, dependendo da regra.
        if (chamado.Status != "Concluido")
        {
            // Poderia lançar InvalidOperationException para ser tratado no controller como BadRequest.
            // "Este chamado não pode ser avaliado pois não está com status Concluido."
            return null;
        }

        // Regra de negócio: Não permitir reavaliar (opcional)
        // if (chamado.AvaliacaoNota.HasValue)
        // {
        //     // "Este chamado já foi avaliado."
        //     return null;
        // }

        chamado.AvaliacaoNota = avaliacaoDto.AvaliacaoNota;
        chamado.AvaliacaoComentario = avaliacaoDto.AvaliacaoComentario;
        chamado.UpdatedAt = DateTime.UtcNow;

        await _chamadoRepository.UpdateAsync(chamado, ct);
        await _chamadoRepository.SaveChangesAsync(ct);

        return MapToChamadoDto(chamado);
    }
}
