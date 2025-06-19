using conViver.Core.Entities;
using conViver.Core.Interfaces;
using conViver.Core.Enums;
using conViver.Core.DTOs;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace conViver.Application
{
    public class OrdemServicoService
    {
        private readonly IRepository<OrdemServico> _ordens;

        public OrdemServicoService(IRepository<OrdemServico> ordens)
        {
            _ordens = ordens;
        }

        public Task<List<OrdemServico>> GetAllAsync(CancellationToken ct = default)
            => _ordens.Query().ToListAsync(ct);

        public Task<OrdemServico?> GetByIdAsync(Guid id, CancellationToken ct = default)
            => _ordens.GetByIdAsync(id, ct);

        public async Task<OrdemServico> CriarAsync(Guid unidadeId, string? descricao, CancellationToken ct = default)
        {
            var os = new OrdemServico
            {
                Id = Guid.NewGuid(),
                UnidadeId = unidadeId,
                Descricao = descricao,
                CriadoEm = DateTime.UtcNow
            };

            await _ordens.AddAsync(os, ct);
            await _ordens.SaveChangesAsync(ct);
            return os;
        }

        public async Task AtualizarStatusAsync(Guid id, string status, CancellationToken ct = default)
        {
            var os = await _ordens.GetByIdAsync(id, ct)
                ?? throw new InvalidOperationException("OS não encontrada");

            if (Enum.TryParse<OrdemServicoStatus>(status, true, out var st))
                os.Status = st;

            os.UpdatedAt = DateTime.UtcNow;
            if (os.Status == OrdemServicoStatus.Concluida)
                os.ConcluidoEm = DateTime.UtcNow;

            await _ordens.UpdateAsync(os, ct);
            await _ordens.SaveChangesAsync(ct);
        }

        public Task AtualizarOSPorSindicoAsync(Guid id, Guid condominioId, Guid sindicoUserId, OrdemServicoStatusUpdateDto dto, CancellationToken ct = default)
            => AtualizarStatusAsync(id, dto.Status, ct);

        // --- Métodos adicionais para compatibilidade com os controllers ---
        public Task<List<OrdemServico>> ListarOSPorCondominioAsync(Guid condominioId, string? status, string? prioridade, CancellationToken ct = default)
        {
            var query = _ordens.Query();
            if (!string.IsNullOrEmpty(status) && Enum.TryParse<OrdemServicoStatus>(status, true, out var st))
                query = query.Where(o => o.Status == st);

            return query.ToListAsync(ct);
        }

        public Task<OrdemServico?> GetOSByIdAsync(Guid id, Guid condominioId, CancellationToken ct = default)
            => _ordens.GetByIdAsync(id, ct);

        public Task<OrdemServico> CriarOSPorSindicoAsync(Guid condominioId, Guid sindicoUserId, OrdemServicoInputSindicoDto dto, CancellationToken ct = default)
            => CriarAsync(dto.UnidadeId ?? Guid.Empty, dto.DescricaoServico, ct);

        public Task AtualizarOSStatusPorSindicoAsync(Guid id, Guid condominioId, Guid sindicoUserId, OrdemServicoStatusUpdateDto dto, CancellationToken ct = default)
            => AtualizarStatusAsync(id, dto.Status, ct);

        public Task<OrdemServico> CriarOSPorUsuarioAsync(Guid condominioId, Guid usuarioId, OrdemServicoInputUserDto dto, CancellationToken ct = default)
            => CriarAsync(dto.UnidadeId ?? Guid.Empty, dto.DescricaoProblema, ct);

        public Task<List<OrdemServico>> ListarOSPorUsuarioAsync(Guid condominioId, Guid usuarioId, string? status, CancellationToken ct = default)
            => ListarOSPorCondominioAsync(condominioId, status, null, ct);

        public Task<OrdemServico?> GetOSByIdForUserAsync(Guid id, Guid condominioId, Guid usuarioId, bool sindico, CancellationToken ct = default)
            => GetOSByIdAsync(id, condominioId, ct);

        public Task<List<OrdemServico>> ListarOSPorPrestadorAsync(Guid prestadorId, string? status, CancellationToken ct = default)
            => ListarOSPorCondominioAsync(Guid.Empty, status, null, ct);

        public Task<OrdemServico?> AtualizarOSProgressoPorPrestadorAsync(Guid id, Guid prestadorId, OrdemServicoProgressoUpdateDto dto, CancellationToken ct = default)
            => GetOSByIdAsync(id, Guid.Empty, ct); // Ainda sem implementação detalhada
    }
}
