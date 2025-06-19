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
    private readonly IRepository<AvaliacaoPrestador> _avaliacaoRepository; // Adicionado

    // IRepository<AvaliacaoPrestador> _avaliacaoRepository não é explicitamente usado abaixo
    // porque o cálculo de rating e total é feito via Include() e LINQ no _prestadorRepository.
    // Se fosse necessário criar/atualizar avaliações de forma isolada, seria injetado.
    // AGORA É NECESSÁRIO PARA SALVAR AVALIAÇÕES.

    public PrestadorService(IRepository<PrestadorServico> prestadorRepository, IRepository<AvaliacaoPrestador> avaliacaoRepository) // Modificado
    {
        _prestadorRepository = prestadorRepository;
        _avaliacaoRepository = avaliacaoRepository; // Adicionado
    }

    public async Task<PrestadorServico> CadastrarPrestadorAsync(Guid condominioId, PrestadorInputDto input, CancellationToken ct = default)
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
            Ativo = true, // Padrão ao cadastrar
            RatingMedio = null, // Será calculado conforme avaliações são adicionadas
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _prestadorRepository.AddAsync(prestador, ct);
        await _prestadorRepository.SaveChangesAsync(ct);

        return prestador;
    }

    public async Task<IEnumerable<PrestadorDto>> ListarPrestadoresAsync(Guid condominioId, string? especialidade, CancellationToken ct = default)
    {
        var query = _prestadorRepository.Query()
            .Where(p => p.CondominioId == condominioId && p.Ativo == true)
            .Include(p => p.Avaliacoes); // Eager load avaliações para cálculo

        if (!string.IsNullOrEmpty(especialidade))
        {
            query = query.Where(p => p.Especialidade != null && p.Especialidade.ToLower().Contains(especialidade.ToLower()));
        }

        var prestadores = await query.ToListAsync(ct);

        // Mapeamento para DTO com cálculo de RatingMedio e TotalAvaliacoes
        return prestadores.Select(p => new PrestadorDto
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
        .OrderByDescending(p => p.RatingMedio ?? 0.0) // Ordena por rating, depois por nome
        .ThenBy(p => p.Nome)
        .ToList();
    }

    // Método auxiliar para mapear PrestadorServico para PrestadorDto
    // Pode ser útil se precisarmos retornar um único PrestadorDto com os cálculos.
    public static PrestadorDto MapToPrestadorDto(PrestadorServico prestador)
    {
        if (prestador == null) throw new ArgumentNullException(nameof(prestador));

        var dto = new PrestadorDto
        {
            Id = prestador.Id,
            Nome = prestador.Nome,
            Telefone = prestador.Telefone,
            Email = prestador.Email,
            Documento = prestador.Documento,
            Especialidade = prestador.Especialidade,
            EnderecoCompleto = prestador.EnderecoCompleto,
            TotalAvaliacoes = prestador.Avaliacoes?.Count ?? 0,
            RatingMedio = (prestador.Avaliacoes?.Any() == true) ? prestador.Avaliacoes.Average(a => a.Nota) : (double?)null,
            DetalhesAvaliacoes = prestador.Avaliacoes?.Select(a => new AvaliacaoPrestadorDto
            {
                Id = a.Id,
                UsuarioId = a.UsuarioId,
                NomeUsuario = "", // Simplificação: NomeUsuario precisaria de lookup no UsuarioService ou join
                Nota = a.Nota,
                Comentario = a.Comentario,
                DataAvaliacao = a.DataAvaliacao,
                OrdemServicoId = a.OrdemServicoId
            }).ToList() ?? new List<AvaliacaoPrestadorDto>()
        };
        return dto;
    }

    public async Task<PrestadorDto?> ObterPrestadorPorIdAsync(Guid prestadorId, Guid condominioId, CancellationToken ct = default)
    {
        var prestador = await _prestadorRepository.Query()
            .Where(p => p.Id == prestadorId && p.CondominioId == condominioId && p.Ativo == true)
            .Include(p => p.Avaliacoes) // Carregar avaliações para DTO
            .FirstOrDefaultAsync(ct);

        if (prestador == null)
        {
            return null;
        }
        return MapToPrestadorDto(prestador);
    }

    public async Task<PrestadorDto?> AtualizarPrestadorAsync(Guid prestadorId, Guid condominioId, PrestadorInputDto input, CancellationToken ct = default)
    {
        var prestador = await _prestadorRepository.Query()
            .Include(p => p.Avaliacoes) // Incluir para que o MapToPrestadorDto funcione corretamente
            .FirstOrDefaultAsync(p => p.Id == prestadorId && p.CondominioId == condominioId, ct);

        if (prestador == null)
        {
            return null;
        }

        // Atualiza os campos
        prestador.Nome = input.Nome;
        prestador.Telefone = input.Telefone;
        prestador.Email = input.Email;
        prestador.Documento = input.Documento;
        prestador.Especialidade = input.Especialidade;
        prestador.EnderecoCompleto = input.EnderecoCompleto;
        prestador.UpdatedAt = DateTime.UtcNow;
        // O campo Ativo não é modificado aqui, apenas em DesativarPrestadorAsync
        // RatingMedio é calculado, não setado diretamente.

        await _prestadorRepository.UpdateAsync(prestador, ct);
        await _prestadorRepository.SaveChangesAsync(ct);

        return MapToPrestadorDto(prestador); // Recalcula DTO com base nos dados atualizados
    }

    public async Task<bool> DesativarPrestadorAsync(Guid prestadorId, Guid condominioId, CancellationToken ct = default)
    {
        var prestador = await _prestadorRepository.Query()
            .FirstOrDefaultAsync(p => p.Id == prestadorId && p.CondominioId == condominioId, ct);

        if (prestador == null)
        {
            return false;
        }

        if (!prestador.Ativo) // Já desativado
        {
            return true; // Ou false se quisermos indicar que nenhuma alteração foi feita
        }

        prestador.Ativo = false;
        prestador.UpdatedAt = DateTime.UtcNow;

        await _prestadorRepository.UpdateAsync(prestador, ct);
        await _prestadorRepository.SaveChangesAsync(ct);
        return true;
    }

    public async Task<AvaliacaoPrestador?> AvaliarPrestadorAsync(Guid prestadorId, Guid condominioId, Guid usuarioId, AvaliacaoPrestadorInputDto avaliacaoInput, CancellationToken ct = default)
    {
        var prestador = await _prestadorRepository.Query()
            .Include(p => p.Avaliacoes) // Incluir avaliações para recalcular o rating
            .FirstOrDefaultAsync(p => p.Id == prestadorId && p.CondominioId == condominioId && p.Ativo == true, ct);

        if (prestador == null)
        {
            return null; // Prestador não encontrado, inativo ou não pertence ao condomínio.
        }

        // Regra de negócio: verificar se o usuário já avaliou este prestador para esta OS (se OSId fornecido)
        // ou se já fez uma avaliação geral (OSId null). Esta lógica pode ser mais complexa.
        // Por simplicidade, vamos permitir múltiplas avaliações por enquanto, ou uma avaliação geral se OSId for null.
        // bool jaAvaliou = await _avaliacaoRepository.Query()
        //    .AnyAsync(a => a.PrestadorServicoId == prestadorId &&
        //                   a.UsuarioId == usuarioId &&
        //                   a.OrdemServicoId == avaliacaoInput.OrdemServicoId, ct);
        // if (jaAvaliou)
        // {
        //    throw new InvalidOperationException("Usuário já avaliou este prestador para esta Ordem de Serviço ou de forma geral.");
        // }

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

        await _avaliacaoRepository.AddAsync(novaAvaliacao, ct);
        // Não precisamos adicionar à coleção prestador.Avaliacoes manualmente se o SaveChangesAsync do _avaliacaoRepository funcionar.
        // No entanto, para recalcular o rating, precisamos garantir que a coleção no objeto 'prestador' esteja atualizada
        // ou recarregar as avaliações.

        await _avaliacaoRepository.SaveChangesAsync(ct); // Salva a avaliação primeiro

        // Recalcular e atualizar RatingMedio do PrestadorServico
        // É importante carregar todas as avaliações do prestador para um cálculo correto.
        // Se a coleção prestador.Avaliacoes não foi atualizada automaticamente pelo EF Core após o SaveChangesAsync acima,
        // precisamos explicitamente adicionar a nova avaliação ou recarregar.
        // Adicionando manualmente para garantir que o cálculo abaixo use a avaliação mais recente.
        // Isso assume que a relação está configurada e o objeto `prestador` ainda está rastreado ou é o mesmo contexto.
        // Uma forma mais segura seria recarregar o prestador ou suas avaliações.

        // Opção 1: Adicionar à coleção em memória (se o objeto prestador ainda estiver sendo rastreado corretamente)
        // prestador.Avaliacoes.Add(novaAvaliacao);
        // Opção 2: Recarregar as avaliações (mais seguro para garantir consistência)
        await _prestadorRepository.Entry(prestador).Collection(p => p.Avaliacoes).LoadAsync(ct);


        if (prestador.Avaliacoes.Any())
        {
            prestador.RatingMedio = prestador.Avaliacoes.Average(a => a.Nota);
        }
        else
        {
            prestador.RatingMedio = null;
        }
        prestador.UpdatedAt = DateTime.UtcNow;

        await _prestadorRepository.UpdateAsync(prestador, ct);
        await _prestadorRepository.SaveChangesAsync(ct); // Salva a atualização do RatingMedio

        return novaAvaliacao;
    }
}
