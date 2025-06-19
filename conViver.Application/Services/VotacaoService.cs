using conViver.Core.Entities;
using conViver.Core.Interfaces;
using conViver.Core.DTOs; // Adicionado
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic; // Adicionado
using System.Linq; // Adicionado
using System.Threading; // Adicionado
using System.Threading.Tasks; // Adicionado

namespace conViver.Application;

public class VotacaoService
{
    private readonly IRepository<Votacao> _votacoes;
    // Se OpcaoVotacao e VotoRegistrado tiverem seus próprios repositórios e serviços,
    // eles podem ser injetados aqui. Por ora, assumimos que _votacoes.Query()
    // permite incluir e manipular entidades relacionadas via EF Core.

    public VotacaoService(IRepository<Votacao> votacoes)
    {
        _votacoes = votacoes;
    }

    // Método ListarAsync original pode ser mantido, removido ou ajustado conforme necessidade.
    // public Task<List<Votacao>> ListarAsync(Guid condominioId, CancellationToken ct = default)
    //    => _votacoes.Query().Where(v => v.CondominioId == condominioId).ToListAsync(ct);

    public async Task<Votacao> CriarAsync(Guid condominioId, VotacaoInputDto input, Guid criadoPorUsuarioId, CancellationToken ct = default)
    {
        var votacao = new Votacao
        {
            Id = Guid.NewGuid(),
            CondominioId = condominioId,
            Titulo = input.Titulo,
            Descricao = input.Descricao ?? string.Empty,
            DataInicio = DateTime.UtcNow,
            DataFim = input.DataFim,
            Status = "Aberta", // Status inicial
            CriadoPor = criadoPorUsuarioId,
            Opcoes = input.Opcoes.Select(o => new OpcaoVotacao
            {
                Id = Guid.NewGuid(),
                Descricao = o.Descricao,
                // VotacaoId será setado automaticamente pelo EF Core ao adicionar à Votacao.Opcoes
            }).ToList()
        };

        await _votacoes.AddAsync(votacao, ct);
        await _votacoes.SaveChangesAsync(ct);
        return votacao; // Retorna a entidade Votacao completa
    }

    public async Task<List<VotacaoResumoDto>> ListarAbertasAsync(Guid condominioId, CancellationToken ct = default)
    {
        return await _votacoes.Query()
            .Where(v => v.CondominioId == condominioId &&
                         v.Status == "Aberta" &&
                         (v.DataFim == null || v.DataFim > DateTime.UtcNow))
            .OrderByDescending(v => v.DataInicio)
            .Select(v => new VotacaoResumoDto
            {
                Id = v.Id,
                Titulo = v.Titulo,
                DataInicio = v.DataInicio,
                DataFim = v.DataFim,
                Status = v.Status
            })
            .ToListAsync(ct);
    }

    public async Task<VotacaoDetalheDto?> ObterDetalhesAsync(Guid votacaoId, Guid condominioId, Guid usuarioId, CancellationToken ct = default)
    {
        var votacao = await _votacoes.Query()
            .Include(v => v.Opcoes)
                .ThenInclude(o => o.VotosRecebidos) // Inclui os votos para cada opção
            .FirstOrDefaultAsync(v => v.Id == votacaoId && v.CondominioId == condominioId, ct);

        if (votacao == null)
        {
            return null;
        }

        var usuarioJaVotou = votacao.Opcoes
                                    .SelectMany(o => o.VotosRecebidos)
                                    .Any(vr => vr.UsuarioId == usuarioId);

        return new VotacaoDetalheDto
        {
            Id = votacao.Id,
            Titulo = votacao.Titulo,
            Descricao = votacao.Descricao,
            DataInicio = votacao.DataInicio,
            DataFim = votacao.DataFim,
            Status = votacao.Status,
            CriadoPor = votacao.CriadoPor,
            Opcoes = votacao.Opcoes.Select(o => new OpcaoVotacaoDto
            {
                Id = o.Id,
                Descricao = o.Descricao,
                QuantidadeVotos = o.VotosRecebidos.Count
            }).ToList(),
            UsuarioJaVotou = usuarioJaVotou
        };
    }

    public async Task<bool> RegistrarVotoAsync(Guid votacaoId, Guid opcaoId, Guid condominioId, Guid usuarioId, Guid unidadeId, string? ip, string? deviceId, CancellationToken ct = default)
    {
        // Usar FirstOrDefaultAsync para poder verificar se a votação ou opção existem
        var votacao = await _votacoes.Query()
            .Include(v => v.Opcoes)
                .ThenInclude(o => o.VotosRecebidos)
            .FirstOrDefaultAsync(v => v.Id == votacaoId && v.CondominioId == condominioId, ct);

        if (votacao == null)
        {
            // Votação não encontrada
            // Poderia lançar uma exceção específica ou retornar um resultado mais detalhado
            return false;
        }

        if (votacao.Status != "Aberta")
        {
            throw new InvalidOperationException("Esta votação não está aberta.");
        }

        if (votacao.DataFim.HasValue && votacao.DataFim.Value < DateTime.UtcNow)
        {
            throw new InvalidOperationException("O período para esta votação já encerrou.");
        }

        var opcaoSelecionada = votacao.Opcoes.FirstOrDefault(o => o.Id == opcaoId);
        if (opcaoSelecionada == null)
        {
            // Opção não encontrada ou não pertence a esta votação
            // Poderia lançar uma exceção específica
            return false;
        }

        bool jaVotou = votacao.Opcoes.SelectMany(o => o.VotosRecebidos)
            .Any(vr => vr.UsuarioId == usuarioId || vr.UnidadeId == unidadeId);
        if (jaVotou)
        {
            throw new InvalidOperationException("Usuário já votou nesta votação.");
        }

        var novoVoto = new VotoRegistrado
        {
            Id = Guid.NewGuid(),
            OpcaoVotacaoId = opcaoId,
            UsuarioId = usuarioId,
            UnidadeId = unidadeId,
            Ip = ip,
            DeviceId = deviceId,
            DataVoto = DateTime.UtcNow
            // A OpcaoVotacao navigation property será ligada pelo EF Core se necessário,
            // mas adicionar à lista OpcaoVotacao.VotosRecebidos é mais direto.
        };

        // Adiciona o voto à opção selecionada.
        // Isso requer que a entidade OpcaoVotacao e sua lista VotosRecebidos sejam rastreadas pelo EF Core.
        // O Include acima deve garantir isso para 'votacao.Opcoes.VotosRecebidos'.
        opcaoSelecionada.VotosRecebidos.Add(novoVoto);

        // Sinaliza ao EF Core que a entidade Votacao (e suas agregadas) foi modificada.
        // Se VotoRegistrado fosse uma entidade raiz gerenciada por seu próprio repositório,
        // usaríamos _votoRegistradoRepository.AddAsync(novoVoto);
        await _votacoes.UpdateAsync(votacao, ct);
        await _votacoes.SaveChangesAsync(ct); // Persiste todas as alterações rastreadas.

        return true;
    }

    public async Task<VotacaoDetalheDto?> ObterResultadoComoSindicoAsync(Guid votacaoId, Guid condominioId, CancellationToken ct = default)
    {
        // Para o síndico, a flag 'UsuarioJaVotou' pode não ser relevante ou pode ser sempre 'false' ou 'true'
        // dependendo da interpretação. Aqui, vamos usar um Guid não existente para usuarioId,
        // o que fará com que UsuarioJaVotou seja consistentemente falso, a menos que um usuário com Guid.Empty tenha votado.
        // Ou, a lógica em ObterDetalhesAsync poderia ser adaptada para pular a verificação de UsuarioJaVotou
        // com base em um parâmetro adicional, ou simplesmente aceitar que essa flag estará lá.

        // Reutilizando ObterDetalhesAsync. A lógica de cálculo de votos já está lá.
        // Passamos Guid.Empty para usuarioId, o que significa que UsuarioJaVotou será (provavelmente) false.
        // Se a intenção é *não* ter o campo UsuarioJaVotou, seria necessário um DTO diferente ou modificar ObterDetalhesAsync.
        var detalhes = await ObterDetalhesAsync(votacaoId, condominioId, Guid.Empty, ct);

        // Se o DTO VotacaoDetalheDto for suficiente, apenas o retornamos.
        // A tarefa menciona que "pode não precisar da lógica de UsuarioJaVotou",
        // o que é atendido por passar um ID de usuário que provavelmente não votou.
        return detalhes;
    }

    public async Task<bool> EncerrarVotacaoAsync(Guid votacaoId, Guid condominioId, Guid usuarioIdResponsavel, CancellationToken ct = default)
    {
        var votacao = await _votacoes.Query()
            .FirstOrDefaultAsync(v => v.Id == votacaoId && v.CondominioId == condominioId, ct);

        if (votacao == null)
        {
            return false; // Votação não encontrada
        }

        // A verificação de permissão (se usuarioIdResponsavel é o CriadoPor ou Síndico)
        // é parcialmente tratada pela role no controller. Aqui poderíamos adicionar
        // uma verificação se o usuarioIdResponsavel é o votacao.CriadoPor, se necessário.
        // Ex: if (votacao.CriadoPor != usuarioIdResponsavel && !UserIsAdminOrSindico(usuarioIdResponsavel)) return false;

        if (votacao.Status == "Encerrada")
        {
            // Votação já está encerrada, pode retornar true ou uma mensagem específica.
            return true;
        }

        votacao.Status = "Encerrada";
        if (!votacao.DataFim.HasValue || votacao.DataFim.Value > DateTime.UtcNow)
        {
            votacao.DataFim = DateTime.UtcNow;
        }

        // Poderia adicionar um campo 'EncerradoPor' e 'EncerradoEm' se fosse necessário auditar.
        // votacao.EncerradoPor = usuarioIdResponsavel;
        // votacao.EncerradoEm = DateTime.UtcNow;

        await _votacoes.UpdateAsync(votacao, ct);
        await _votacoes.SaveChangesAsync(ct);

        return true;
    }
}

