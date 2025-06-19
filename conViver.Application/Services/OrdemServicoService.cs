using conViver.Core.Entities;
using conViver.Core.Interfaces;
using conViver.Core.Enums;
using conViver.Core.DTOs;
using Microsoft.EntityFrameworkCore;
using conViver.Core.Entities; // For Usuario, Unidade, PrestadorServico if not already covered
using conViver.Core.Interfaces; // For IRepository types

namespace conViver.Application;

public class OrdemServicoService
{
    private readonly IRepository<OrdemServico> _ordemServicoRepository;
    private readonly IRepository<Usuario> _usuarioRepository;
    private readonly IRepository<Unidade> _unidadeRepository;
    private readonly IRepository<PrestadorServico> _prestadorRepository;

    public OrdemServicoService(
        IRepository<OrdemServico> ordemServicoRepository,
        IRepository<Usuario> usuarioRepository,
        IRepository<Unidade> unidadeRepository,
        IRepository<PrestadorServico> prestadorRepository)
    {
        _ordemServicoRepository = ordemServicoRepository;
        _usuarioRepository = usuarioRepository;
        _unidadeRepository = unidadeRepository;
        _prestadorRepository = prestadorRepository;
    }

    public Task<List<OrdemServico>> GetAllAsync(CancellationToken ct = default)
        => _ordemServicoRepository.Query().ToListAsync(ct);

    public Task<OrdemServico?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => _ordemServicoRepository.GetByIdAsync(id, ct);

    // Old CriarAsync removed as it's replaced by DTO-specific creation methods.

    public async Task AtualizarStatusAsync(Guid id, string status, CancellationToken ct = default)
    {
        var os = await _ordemServicoRepository.GetByIdAsync(id, ct) ?? throw new InvalidOperationException("OS nao encontrada");
        if (Enum.TryParse<OrdemServicoStatus>(status, true, out var st))
            os.Status = st;
        os.UpdatedAt = DateTime.UtcNow;
        if (os.Status == OrdemServicoStatus.Concluida) // TODO: Review this, Concluida might have a different meaning now
            os.DataConclusao = DateTime.UtcNow; // Entity field renamed
        await _ordemServicoRepository.UpdateAsync(os, ct);
        await _ordemServicoRepository.SaveChangesAsync(ct);
    }

    // --- Métodos adicionais para compatibilidade com os controllers ---
    // These will be refactored or removed in subsequent steps.
    // For now, just ensuring they compile if they refer to _ordemServicoRepository or renamed entity fields.
    public Task<List<OrdemServico>> ListarOSPorCondominioAsync(Guid condominioId, string? status, string? prioridade, CancellationToken ct = default)
    {
        var query = _ordemServicoRepository.Query();
        // TODO: Add CondominioId filter: query = query.Where(o => o.CondominioId == condominioId);
        if (!string.IsNullOrEmpty(status) && Enum.TryParse<OrdemServicoStatus>(status, true, out var st))
            query = query.Where(o => o.Status == st);
        return query.ToListAsync(ct);
    }

    public Task<OrdemServico?> GetOSByIdAsync(Guid id, Guid condominioId, CancellationToken ct = default) // TODO: Add CondominioId filter
        => _ordemServicoRepository.GetByIdAsync(id, ct);

    public async Task<OrdemServicoDto> CriarOSPorSindicoAsync(Guid condominioId, Guid sindicoUserId, OrdemServicoInputSindicoDto inputDto, CancellationToken ct = default)
    {
        var osEntity = new OrdemServico
        {
            Id = Guid.NewGuid(),
            CondominioId = condominioId,
            UsuarioSolicitanteId = sindicoUserId, // Sindico is the requester
            Titulo = inputDto.Titulo,
            DescricaoProblema = inputDto.DescricaoProblema,
            DescricaoServico = inputDto.DescricaoServico,
            UnidadeId = inputDto.UnidadeId ?? Guid.Empty, // Assuming Guid.Empty for common areas if UnidadeId is non-nullable in entity.
            Local = inputDto.Local,
            CategoriaServico = inputDto.CategoriaServico,
            PrestadorId = inputDto.PrestadorServicoId, // Entity field is PrestadorId
            DataAgendamento = inputDto.DataAgendamento,
            CustoEstimado = inputDto.CustoEstimado,
            Prioridade = inputDto.Prioridade,
            Anexos = inputDto.Anexos,
            ObservacoesSindico = inputDto.ObservacoesSindico,
            ImpactoColetivo = inputDto.ImpactoColetivo,
            Status = OrdemServicoStatus.Aberta, // Default, admin can change this via Update method if needed immediately
            CriadoEm = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _ordemServicoRepository.AddAsync(osEntity, ct);
        await _ordemServicoRepository.SaveChangesAsync(ct);

        // Placeholder for mapping - full mapping will be in MapToOrdemServicoDtoAsync
        return new OrdemServicoDto {
            Id = osEntity.Id,
            Titulo = osEntity.Titulo,
            DescricaoProblema = osEntity.DescricaoProblema,
            DescricaoServico = osEntity.DescricaoServico,
            Local = osEntity.Local,
            CategoriaServico = osEntity.CategoriaServico,
            Status = osEntity.Status.ToString(),
            Prioridade = osEntity.Prioridade,
            DataAbertura = osEntity.CriadoEm,
            DataAgendamento = osEntity.DataAgendamento,
            CondominioId = osEntity.CondominioId,
            UsuarioSolicitanteId = osEntity.UsuarioSolicitanteId,
            UnidadeId = osEntity.UnidadeId == Guid.Empty ? null : osEntity.UnidadeId,
            PrestadorServicoId = osEntity.PrestadorId,
            CustoEstimado = osEntity.CustoEstimado,
            Anexos = osEntity.Anexos,
            ObservacoesSindico = osEntity.ObservacoesSindico,
            ImpactoColetivo = osEntity.ImpactoColetivo,
            UpdatedAt = osEntity.UpdatedAt,
            HistoricoProgresso = new List<OsProgressoDto>() // Empty list for now
        };
    }

    public Task AtualizarOSStatusPorSindicoAsync(Guid id, Guid condominioId, Guid sindicoUserId, OrdemServicoUpdateSindicoDto dto, CancellationToken ct = default) // DTO type changed
        => AtualizarStatusAsync(id, dto.Status, ct); // Basic passthrough for now

    public async Task<OrdemServicoDto> CriarOSPorUsuarioAsync(Guid condominioId, Guid usuarioId, OrdemServicoInputUserDto inputDto, CancellationToken ct = default)
    {
        var osEntity = new OrdemServico
        {
            Id = Guid.NewGuid(),
            CondominioId = condominioId,
            UsuarioSolicitanteId = usuarioId,
            DescricaoProblema = inputDto.DescricaoProblema, // Entity field renamed
            UnidadeId = inputDto.UnidadeId ?? Guid.Empty, // Assuming Guid.Empty for common areas if UnidadeId must be non-nullable. Or make UnidadeId nullable in entity.
                                                          // For now, if UnidadeId is non-nullable in entity, this handles potential null from DTO.
                                                          // This should be reviewed based on entity definition (UnidadeId is currently Guid, not Guid?)
            CategoriaServico = inputDto.CategoriaServico,
            Local = inputDto.Local,
            Anexos = inputDto.Anexos,
            Status = OrdemServicoStatus.Aberta, // Default status
            Prioridade = "Media", // Default priority for user-created OS
            Titulo = $"OS Solicitada: {inputDto.CategoriaServico} em {inputDto.Local}", // Auto-generated title
            CriadoEm = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _ordemServicoRepository.AddAsync(osEntity, ct);
        await _ordemServicoRepository.SaveChangesAsync(ct);

        return await MapToOrdemServicoDtoAsync(osEntity, ct);
    }

    public Task<List<OrdemServico>> ListarOSPorUsuarioAsync(Guid condominioId, Guid usuarioId, string? status, CancellationToken ct = default)
        => ListarOSPorCondominioAsync(condominioId, status, null, ct); // TODO: Add UsuarioId filter

    public Task<OrdemServico?> GetOSByIdForUserAsync(Guid id, Guid condominioId, Guid usuarioId, bool sindico, CancellationToken ct = default)
        => GetOSByIdAsync(id, condominioId, ct);

    public Task<List<OrdemServico>> ListarOSPorPrestadorAsync(Guid prestadorId, string? status, CancellationToken ct = default)
        => ListarOSPorCondominioAsync(Guid.Empty, status, null, ct); // TODO: Add PrestadorId filter

    public Task<OrdemServico?> AtualizarOSProgressoPorPrestadorAsync(Guid id, Guid prestadorId, OrdemServicoProgressoUpdateDto dto, CancellationToken ct = default)
        => GetOSByIdAsync(id, Guid.Empty, ct); // Sem implementação detalhada // TODO: Refactor this method

    #region Private Helper Methods

    private async Task<OrdemServicoDto> MapToOrdemServicoDtoAsync(OrdemServico os, CancellationToken ct = default)
    {
        if (os == null)
        {
            // Or handle as per application's error strategy, e.g., throw new ArgumentNullException(nameof(os));
            // For now, returning an empty DTO or null might be an option if the caller expects nullability.
            // However, if os is expected to be non-null here, throwing is better.
            // Given the usage context (after creation or fetching a known OS), null might indicate an issue.
            // Let's assume os is not null for this basic mapping.
            throw new ArgumentNullException(nameof(os));
        }

        // Basic mapping for now. Will be expanded with lookups for names and progress history.
        var dto = new OrdemServicoDto
        {
            Id = os.Id,
            CondominioId = os.CondominioId,
            Titulo = os.Titulo,
            DescricaoProblema = os.DescricaoProblema,
            DescricaoServico = os.DescricaoServico,
            UsuarioSolicitanteId = os.UsuarioSolicitanteId,
            // NomeUsuarioSolicitante = await _usuarioRepository.GetByIdAsync(os.UsuarioSolicitanteId, ct)?.Nome, // Example lookup
            UnidadeId = os.UnidadeId == Guid.Empty ? null : os.UnidadeId,
            // NomeUnidade = os.UnidadeId.HasValue && os.UnidadeId.Value != Guid.Empty ? await _unidadeRepository.GetByIdAsync(os.UnidadeId.Value, ct)?.Nome : "Área Comum", // Example lookup
            Local = os.Local,
            CategoriaServico = os.CategoriaServico,
            Status = os.Status.ToString(),
            Prioridade = os.Prioridade,
            DataAbertura = os.CriadoEm,
            DataAgendamento = os.DataAgendamento,
            DataConclusao = os.DataConclusao,
            // DataEncerramento - This field is not directly on OrdemServico entity yet. Might be derived from a final status + UpdatedAt.
            PrestadorServicoId = os.PrestadorId,
            // NomePrestadorServico = os.PrestadorId.HasValue ? await _prestadorRepository.GetByIdAsync(os.PrestadorId.Value, ct)?.Nome : null, // Example lookup
            CustoEstimado = os.CustoEstimado,
            CustoFinal = os.CustoFinal,
            Anexos = os.Anexos,
            ObservacoesSindico = os.ObservacoesSindico,
            RelatorioFinal = os.RelatorioFinal,
            ImpactoColetivo = os.ImpactoColetivo,
            AvisoMuralGerado = os.AvisoMuralGerado,
            UpdatedAt = os.UpdatedAt,
            HistoricoProgresso = new List<OsProgressoDto>() // Placeholder
        };

        // Simulate fetching NomeUsuarioSolicitante (replace with actual DB call when ready)
        if (_usuarioRepository != null)
        {
            var usuario = await _usuarioRepository.GetByIdAsync(os.UsuarioSolicitanteId, ct);
            dto.NomeUsuarioSolicitante = usuario?.Nome ?? "Usuário não encontrado";
        }

        // Simulate fetching NomeUnidade (replace with actual DB call when ready)
        if (_unidadeRepository != null && os.UnidadeId != Guid.Empty)
        {
            var unidade = await _unidadeRepository.GetByIdAsync(os.UnidadeId, ct); // Assuming UnidadeId is non-nullable in DB if not Guid.Empty
            dto.NomeUnidade = unidade?.Nome ?? "Unidade não encontrada";
        }
        else if (os.UnidadeId == Guid.Empty)
        {
            dto.NomeUnidade = "Área Comum";
        }

        // Simulate fetching NomePrestadorServico (replace with actual DB call when ready)
        if (_prestadorRepository != null && os.PrestadorId.HasValue)
        {
            var prestador = await _prestadorRepository.GetByIdAsync(os.PrestadorId.Value, ct);
            dto.NomePrestadorServico = prestador?.Nome ?? "Prestador não encontrado";
        }

        // TODO: Populate HistoricoProgresso - requires separate logic/repository for progress entries.

        return dto;
    }

    #endregion
}

