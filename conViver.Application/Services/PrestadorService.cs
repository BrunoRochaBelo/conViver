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

public class PrestadorService
{
    private readonly IRepository<PrestadorServico> _prestadorRepository;
    private readonly IRepository<AvaliacaoPrestador> _avaliacaoRepository;

    public PrestadorService(
        IRepository<PrestadorServico> prestadorRepository,
        IRepository<AvaliacaoPrestador> avaliacaoRepository)
    {
        _prestadorRepository = prestadorRepository;
        _avaliacao_repository = avaliacaoRepository;
    }

    public async Task<PrestadorServico> CadastrarPrestadorAsync(
        Guid condominioId,
        PrestadorInputDto input,
        CancellationToken ct = default)
    {
        var prestador = new PrestadorServico
        {
            Id = Guid.NewGuid(),
            CondominioId = condominioId,
            Nome = input.Nome,
            Telefone = input.Telefone,
            Email = input.Email,
            Documento = input.Documento,
            Especialidade = input.Especialidade,
            EnderecoCompleto = input.EnderecoCompleto,
            Ativo = true,
            RatingMedio = null,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _prestadorRepository.AddAsync(prestador, ct);
        await _prestadorRepository.SaveChangesAsync(ct);
        return prestador;
    }

    public async Task<IEnumerable<PrestadorDto>> ListarPrestadoresAsync(
        Guid condominioId,
        string? especialidade,
        CancellationToken ct = default)
    {
        var query = _prestadorRepository.Query()
            .Where(p => p.CondominioId == condominioId && p.Ativo);

        if (!string.IsNullOrEmpty(especialidade))
        {
            query = query.Where(p =>
                p.Especialidade != null &&
                p.Especialidade.Contains(especialidade, StringComparison.OrdinalIgnoreCase));
        }

        var prestadores = await query
            .Include(p => p.Avaliacoes)
            .ToListAsync(ct);

        return prestadores
            .Select(p => new PrestadorDto
            {
                Id = p.Id,
                Nome = p.Nome,
                Telefone = p.Telefone,
                Email = p.Email,
                Documento = p.Documento,
                Especialidade = p.Especialidade,
                EnderecoCompleto = p.EnderecoCompleto,
                TotalAvaliacoes = p.Avaliacoes.Count,
                RatingMedio = p.Avaliacoes.Any() ? p.Avaliacoes.Average(a => a.Nota) : (double?)null
            })
            .OrderByDescending(d => d.RatingMedio ?? 0.0)
            .ThenBy(d => d.Nome);
    }

    public static PrestadorDto MapToPrestadorDto(PrestadorServico prestador)
    {
        if (prestador == null) throw new ArgumentNullException(nameof(prestador));

        return new PrestadorDto
        {
            Id = prestador.Id,
            Nome = prestador.Nome,
            Telefone = prestador.Telefone,
            Email = prestador.Email,
            Documento = prestador.Documento,
            Especialidade = prestador.Especialidade,
            EnderecoCompleto = prestador.EnderecoCompleto,
            TotalAvaliacoes = prestador.Avaliacoes?.Count ?? 0,
            RatingMedio = (prestador.Avaliacoes?.Any() == true)
                ? prestador.Avaliacoes.Average(a => a.Nota)
                : (double?)null,
            DetalhesAvaliacoes = prestador.Avaliacoes?
                .Select(a => new AvaliacaoPrestadorDto
                {
                    Id = a.Id,
                    UsuarioId = a.UsuarioId,
                    NomeUsuario = "", // precisa lookup se for lançado
                    Nota = a.Nota,
                    Comentario = a.Comentario,
                    DataAvaliacao = a.DataAvaliacao,
                    OrdemServicoId = a.OrdemServicoId
                })
                .ToList()
                ?? new List<AvaliacaoPrestadorDto>()
        };
    }

    public async Task<PrestadorDto?> ObterPrestadorPorIdAsync(
        Guid prestadorId,
        Guid condominioId,
        CancellationToken ct = default)
    {
        var prestador = await _prestadorRepository.Query()
            .Where(p => p.Id == prestadorId && p.CondominioId == condominioId && p.Ativo)
            .Include(p => p.Avaliacoes)
            .FirstOrDefaultAsync(ct);

        return prestador == null
            ? null
            : MapToPrestadorDto(prestador);
    }

    public async Task<PrestadorDto?> AtualizarPrestadorAsync(
        Guid prestadorId,
        Guid condominioId,
        PrestadorInputDto input,
        CancellationToken ct = default)
    {
        var prestador = await _prestadorRepository.Query()
            .Include(p => p.Avaliacoes)
            .FirstOrDefaultAsync(p =>
                p.Id == prestadorId &&
                p.CondominioId == condominioId, ct);

        if (prestador == null) return null;

        prestador.Nome = input.Nome;
        prestador.Telefone = input.Telefone;
        prestador.Email = input.Email;
        prestador.Documento = input.Documento;
        prestador.Especialidade = input.Especialidade;
        prestador.EnderecoCompleto = input.EnderecoCompleto;
        prestador.UpdatedAt = DateTime.UtcNow;

        await _prestadorRepository.UpdateAsync(prestador, ct);
        await _prestadorRepository.SaveChangesAsync(ct);

        return MapToPrestadorDto(prestador);
    }

    public async Task<bool> DesativarPrestadorAsync(
        Guid prestadorId,
        Guid condominioId,
        CancellationToken ct = default)
    {
        var prestador = await _prestadorRepository.Query()
            .FirstOrDefaultAsync(p =>
                p.Id == prestadorId &&
                p.CondominioId == condominioId, ct);

        if (prestador == null) return false;
        if (!prestador.Ativo) return true;

        prestador.Ativo = false;
        prestador.UpdatedAt = DateTime.UtcNow;

        await _prestadorRepository.UpdateAsync(prestador, ct);
        await _prestadorRepository.SaveChangesAsync(ct);
        return true;
    }

    public async Task<AvaliacaoPrestador?> AvaliarPrestadorAsync(
        Guid prestadorId,
        Guid condominioId,
        Guid usuarioId,
        AvaliacaoPrestadorInputDto avaliacaoInput,
        CancellationToken ct = default)
    {
        var prestador = await _prestadorRepository.Query()
            .Include(p => p.Avaliacoes)
            .FirstOrDefaultAsync(p =>
                p.Id == prestadorId &&
                p.CondominioId == condominioId &&
                p.Ativo, ct);

        if (prestador == null) return null;

        var novaAvaliacao = new AvaliacaoPrestador
        {
            Id = Guid.NewGuid(),
            PrestadorServicoId = prestadorId,
            CondominioId = condominioId,
            UsuarioId = usuarioId,
            Nota = avaliacaoInput.Nota,
            Comentario = avaliacaoInput.Comentario,
            DataAvaliacao = DateTime.UtcNow,
            OrdemServicoId = avaliacaoInput.OrdemServicoId
        };

        await _avaliacao_repository.AddAsync(novaAvaliacao, ct);
        await _avaliacao_repository.SaveChangesAsync(ct);

        // Recarrega avaliações para recálculo
        prestador = await _prestador_repository.Query()
            .Include(p => p.Avaliacoes)
            .FirstAsync(p =>
                p.Id == prestadorId &&
                p.CondominioId == condominioId, ct);

        prestador.RatingMedio = prestador.Avaliacoes.Any()
            ? prestador.Avaliacoes.Average(a => a.Nota)
            : (double?)null;
        prestador.UpdatedAt = DateTime.UtcNow;

        await _prestador_repository.UpdateAsync(prestador, ct);
        await _prestador_repository.SaveChangesAsync(ct);

        return novaAvaliacao;
    }
}
