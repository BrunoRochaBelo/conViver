using conViver.Core.Entities;
using conViver.Core.Interfaces;
using conViver.Core.DTOs;
using conViver.Core.Enums;
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
    private readonly IRepository<OrdemServico> _ordemServicoRepository;

    // IRepository<AvaliacaoPrestador> _avaliacaoRepository não é explicitamente usado abaixo
    // porque o cálculo de rating e total é feito via Include() e LINQ no _prestadorRepository.
    // Se fosse necessário criar/atualizar avaliações de forma isolada, seria injetado.
    // AGORA É NECESSÁRIO PARA SALVAR AVALIAÇÕES.

    public PrestadorService(
        IRepository<PrestadorServico> prestadorRepository,
        IRepository<AvaliacaoPrestador> avaliacaoRepository,
        IRepository<OrdemServico> ordemServicoRepository) // Add this
    {
        _prestadorRepository = prestadorRepository;
        _avaliacaoRepository = avaliacaoRepository; // Adicionado
        _ordemServicoRepository = ordemServicoRepository; // Add this
    }

    public async Task<PrestadorDto> CadastrarPrestadorAsync(Guid condominioId, PrestadorInputDto input, CancellationToken ct = default)
    {
        var prestador = new PrestadorServico
        {
            Id = Guid.NewGuid(),
            CondominioId = condominioId,
            Nome = input.Nome,
            RazaoSocial = input.RazaoSocial,
            Telefone = input.Telefone,
            Email = input.Email,
            CpfCnpj = input.CpfCnpj,
            DocumentosObrigatorios = input.DocumentosObrigatorios,
            Especialidade = input.Especialidade,
            EnderecoCompleto = input.EnderecoCompleto,
            Ativo = true, // Padrão ao cadastrar
            RatingMedio = null, // Será calculado conforme avaliações são adicionadas
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _prestadorRepository.AddAsync(prestador, ct);
        await _prestadorRepository.SaveChangesAsync(ct);

        return await this.MapToPrestadorDto(prestador); // Call the instance method and return the DTO
    }

    public async Task<IEnumerable<PrestadorDto>> ListarPrestadoresAsync(Guid condominioId, string? especialidade, CancellationToken ct = default)
    {
        IQueryable<PrestadorServico> query = _prestadorRepository.Query()
            .Where(p => p.CondominioId == condominioId && p.Ativo == true);

        if (!string.IsNullOrEmpty(especialidade))
        {
            query = query.Where(p => p.Especialidade != null && p.Especialidade.ToLower().Contains(especialidade.ToLower()));
        }

        var prestadores = await query
            .Include(p => p.Avaliacoes)
            .ToListAsync(ct);

        var dtos = new List<PrestadorDto>();
        foreach (var prestador in prestadores)
        {
            dtos.Add(await this.MapToPrestadorDto(prestador)); // Await the async call
        }

        return dtos
            .OrderByDescending(p => p.RatingMedio ?? 0.0)
            .ThenBy(p => p.Nome)
            .ToList();
    }

    // Método auxiliar para mapear PrestadorServico para PrestadorDto
    // Pode ser útil se precisarmos retornar um único PrestadorDto com os cálculos.
    public async Task<PrestadorDto> MapToPrestadorDto(PrestadorServico prestador)
    {
        if (prestador == null) throw new ArgumentNullException(nameof(prestador));

        var dto = new PrestadorDto
        {
            Id = prestador.Id,
            Nome = prestador.Nome,
            RazaoSocial = prestador.RazaoSocial,
            Telefone = prestador.Telefone,
            Email = prestador.Email,
            CpfCnpj = prestador.CpfCnpj,
            DocumentosObrigatorios = prestador.DocumentosObrigatorios,
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

        var historicoServicos = new List<OrdemServicoResumoDto>();
        if (_ordemServicoRepository != null && prestador.Id != Guid.Empty) // Check repository and valid prestador Id
        {
            // Assuming OrdemServico entity has a nullable Guid PrestadorId field
            var osDoPrestador = await _ordemServicoRepository.Query()
                .Where(os => os.PrestadorId == prestador.Id) // Uses current OrdemServico.PrestadorId
                .OrderByDescending(os => os.CriadoEm) // Order by creation date or relevant date
                .ToListAsync(); // Ensure using Microsoft.EntityFrameworkCore for ToListAsync

            foreach (var os in osDoPrestador)
            {
                historicoServicos.Add(new OrdemServicoResumoDto
                {
                    Id = os.Id,
                    // DataServico: Use ConcluidoEm if available, otherwise CriadoEm. DataAgendamento will be added later.
                    DataServico = os.ConcluidoEm ?? os.CriadoEm,
                    // DescricaoBreve: Use Descricao. Titulo/DescricaoServico will be added later.
                    DescricaoBreve = os.Descricao?.Length > 100 ? os.Descricao.Substring(0, 100) + "..." : os.Descricao,
                    Status = os.Status.ToString()
                });
            }
        }
        dto.HistoricoServicos = historicoServicos;
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
        return await this.MapToPrestadorDto(prestador);
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
        prestador.RazaoSocial = input.RazaoSocial;
        prestador.Telefone = input.Telefone;
        prestador.Email = input.Email;
        prestador.CpfCnpj = input.CpfCnpj;
        prestador.DocumentosObrigatorios = input.DocumentosObrigatorios;
        prestador.Especialidade = input.Especialidade;
        prestador.EnderecoCompleto = input.EnderecoCompleto;
        prestador.UpdatedAt = DateTime.UtcNow;
        // O campo Ativo não é modificado aqui, apenas em DesativarPrestadorAsync
        // RatingMedio é calculado, não setado diretamente.

        await _prestadorRepository.UpdateAsync(prestador, ct);
        await _prestadorRepository.SaveChangesAsync(ct);

        return await this.MapToPrestadorDto(prestador); // Recalcula DTO com base nos dados atualizados
    }

    public async Task<bool> DesativarPrestadorAsync(Guid prestadorId, Guid condominioId, CancellationToken ct = default)
    {
        var prestador = await _prestadorRepository.Query()
            .FirstOrDefaultAsync(p => p.Id == prestadorId && p.CondominioId == condominioId, ct);

        if (prestador == null)
        {
            return false; // Or throw NotFoundException
        }

        // Check for active Ordens de Servico
        // Assuming OrdemServicoStatus enum has Concluida and Cancelada
        // Encerrada will be added in Phase 2. For now, check against existing final states.
        var pendingOs = await _ordemServicoRepository.Query()
            .AnyAsync(os => os.PrestadorId == prestadorId &&
                             os.Status != OrdemServicoStatus.Concluida &&
                             os.Status != OrdemServicoStatus.Cancelada, // Add other final states here if they exist
                             ct);

        if (pendingOs)
        {
            // Consider using a custom exception or a more specific one if available
            throw new InvalidOperationException("Prestador não pode ser desativado pois possui Ordens de Serviço pendentes ou em andamento.");
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

        // Recarrega as avaliações para garantir que o cálculo considere a nova avaliação
        prestador = await _prestadorRepository.Query()
            .Include(p => p.Avaliacoes)
            .FirstAsync(p => p.Id == prestadorId && p.CondominioId == condominioId, ct);


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
