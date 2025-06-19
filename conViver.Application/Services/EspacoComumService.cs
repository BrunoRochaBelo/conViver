using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using conViver.Core.DTOs;
using conViver.Core.Entities;
using conViver.Core.Interfaces;
using Microsoft.EntityFrameworkCore; // Required for ToListAsync, Include etc.
using conViver.Application.Exceptions; // For NotFoundException

namespace conViver.Application.Services
{
    public class EspacoComumService
    {
        private readonly IRepository<EspacoComum> _espacoComumRepository;
        private readonly IRepository<Condominio> _condominioRepository; // Assuming Condominio entity and repository exist

        public EspacoComumService(IRepository<EspacoComum> espacoComumRepository, IRepository<Condominio> condominioRepository)
        {
            _espacoComumRepository = espacoComumRepository;
            _condominioRepository = condominioRepository;
        }

        public async Task<EspacoComumDto?> CriarEspacoComumAsync(EspacoComumInputDto dto, Guid condominioIdClaim)
        {
            if (dto.CondominioId != condominioIdClaim)
            {
                throw new ArgumentException("A ID do condomínio fornecida no DTO não corresponde à ID do condomínio do usuário autenticado.");
            }

            var condominioExists = await _condominioRepository.GetByIdAsync(dto.CondominioId);
            if (condominioExists == null)
            {
                throw new NotFoundException($"Condomínio com ID {dto.CondominioId} não encontrado.");
            }

            var espacoComum = new EspacoComum
            {
                Id = Guid.NewGuid(),
                CondominioId = dto.CondominioId,
                Nome = dto.Nome,
                Descricao = dto.Descricao,
                Capacidade = dto.Capacidade,
                FotoUrl = dto.FotoUrl,
                PermiteReserva = dto.PermiteReserva,
                ExigeAprovacaoAdmin = dto.ExigeAprovacaoAdmin,
                AntecedenciaMinimaReservaHoras = dto.AntecedenciaMinimaReservaHoras,
                DuracaoMaximaReservaMinutos = dto.DuracaoMaximaReservaMinutos,
                LimiteReservasPorMesPorUnidade = dto.LimiteReservasPorMesPorUnidade,
                TaxaReserva = dto.TaxaReserva,
                HorariosPermitidosJson = dto.HorariosPermitidosJson,
                DiasBloqueadosJson = dto.DiasBloqueadosJson,
                ExibirNoMural = dto.ExibirNoMural,
                TermoDeUso = dto.TermoDeUso,
                AntecedenciaMinimaCancelamentoHoras = dto.AntecedenciaMinimaCancelamentoHoras
            };

            await _espacoComumRepository.AddAsync(espacoComum);
            await _espacoComumRepository.SaveChangesAsync();

            return MapToDto(espacoComum);
        }

        public async Task<EspacoComumDto?> AtualizarEspacoComumAsync(Guid espacoId, EspacoComumInputDto dto, Guid condominioIdClaim)
        {
            var espacoComum = await _espacoComumRepository.GetByIdAsync(espacoId);
            if (espacoComum == null)
            {
                throw new NotFoundException($"Espaço Comum com ID {espacoId} não encontrado.");
            }

            if (espacoComum.CondominioId != condominioIdClaim)
            {
                throw new UnauthorizedAccessException("Você não tem permissão para atualizar este espaço comum.");
            }

            if (dto.CondominioId != espacoComum.CondominioId)
            {
                 throw new ArgumentException("Não é permitido alterar a ID do condomínio de um espaço comum ou a ID do condomínio no DTO é inválida.");
            }

            espacoComum.Nome = dto.Nome;
            espacoComum.Descricao = dto.Descricao;
            espacoComum.Capacidade = dto.Capacidade;
            espacoComum.FotoUrl = dto.FotoUrl;
            espacoComum.PermiteReserva = dto.PermiteReserva;
            espacoComum.ExigeAprovacaoAdmin = dto.ExigeAprovacaoAdmin;
            espacoComum.AntecedenciaMinimaReservaHoras = dto.AntecedenciaMinimaReservaHoras;
            espacoComum.DuracaoMaximaReservaMinutos = dto.DuracaoMaximaReservaMinutos;
            espacoComum.LimiteReservasPorMesPorUnidade = dto.LimiteReservasPorMesPorUnidade;
            espacoComum.TaxaReserva = dto.TaxaReserva;
            espacoComum.HorariosPermitidosJson = dto.HorariosPermitidosJson;
            espacoComum.DiasBloqueadosJson = dto.DiasBloqueadosJson;
            espacoComum.ExibirNoMural = dto.ExibirNoMural;
            espacoComum.TermoDeUso = dto.TermoDeUso;
            espacoComum.AntecedenciaMinimaCancelamentoHoras = dto.AntecedenciaMinimaCancelamentoHoras;

            await _espacoComumRepository.UpdateAsync(espacoComum);
            await _espacoComumRepository.SaveChangesAsync();

            return MapToDto(espacoComum);
        }

        public async Task<EspacoComumDto?> ObterEspacoComumPorIdAsync(Guid espacoId, Guid condominioIdClaim)
        {
            var espacoComum = await _espacoComumRepository.GetByIdAsync(espacoId);

            if (espacoComum == null)
            {
                return null;
            }

            if (espacoComum.CondominioId != condominioIdClaim)
            {
                // Instead of returning null, which might be ambiguous,
                // consider throwing UnauthorizedAccessException or a specific "NotFoundForUser" exception
                // For now, returning null as per original plan to indicate "not found or not permitted"
                return null;
            }
            return MapToDto(espacoComum);
        }

        public async Task<IEnumerable<EspacoComumDto>> ListarEspacosComunsAsync(Guid condominioId)
        {
            var espacos = await _espacoComumRepository.Query()
                                     .Where(ec => ec.CondominioId == condominioId)
                                     .ToListAsync();
            return espacos.Select(MapToDto);
        }

        public async Task<bool> ExcluirEspacoComumAsync(Guid espacoId, Guid condominioIdClaim)
        {
            var espacoComum = await _espacoComumRepository.GetByIdAsync(espacoId);
            if (espacoComum == null)
            {
                throw new NotFoundException($"Espaço Comum com ID {espacoId} não encontrado.");
            }

            if (espacoComum.CondominioId != condominioIdClaim)
            {
                 throw new UnauthorizedAccessException("Você não tem permissão para excluir este espaço comum.");
            }

            // TODO: Consider adding a check for active or future reservations associated with this EspacoComum.
            // If reservations exist, deletion might be prevented or require special handling.

            await _espacoComumRepository.DeleteAsync(espacoComum);
            await _espacoComumRepository.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DefinirRegrasUsoAsync(Guid espacoId, RegrasUsoEspacoDto regrasDto, Guid condominioIdClaim)
        {
            var espacoComum = await _espacoComumRepository.GetByIdAsync(espacoId);
            if (espacoComum == null)
            {
                throw new NotFoundException($"Espaço Comum com ID {espacoId} não encontrado.");
            }
            if (espacoComum.CondominioId != condominioIdClaim)
            {
                 throw new UnauthorizedAccessException("Você não tem permissão para definir regras para este espaço comum.");
            }

            espacoComum.LimiteReservasPorMesPorUnidade = regrasDto.LimiteReservasPorMesPorUnidade;
            espacoComum.AntecedenciaMinimaReservaHoras = regrasDto.AntecedenciaMinimaReservaHoras;
            espacoComum.DuracaoMaximaReservaMinutos = regrasDto.DuracaoMaximaReservaMinutos;
            espacoComum.TaxaReserva = regrasDto.TaxaReserva;
            // Note: HorariosPermitidosJson and DiasBloqueadosJson are not part of RegrasUsoEspacoDto in the current DTO definition.
            // If they need to be updated here, the DTO needs to be adjusted or another method/DTO should be used.
            espacoComum.TermoDeUso = regrasDto.TermoDeUso; // TermoDeUso is in RegrasUsoEspacoDto

            await _espacoComumRepository.UpdateAsync(espacoComum);
            await _espacoComumRepository.SaveChangesAsync();
            return true;
        }

        private EspacoComumDto MapToDto(EspacoComum espacoComum)
        {
            return new EspacoComumDto
            {
                Id = espacoComum.Id,
                CondominioId = espacoComum.CondominioId,
                Nome = espacoComum.Nome,
                Descricao = espacoComum.Descricao,
                Capacidade = espacoComum.Capacidade,
                FotoUrl = espacoComum.FotoUrl,
                PermiteReserva = espacoComum.PermiteReserva,
                ExigeAprovacaoAdmin = espacoComum.ExigeAprovacaoAdmin,
                AntecedenciaMinimaReservaHoras = espacoComum.AntecedenciaMinimaReservaHoras,
                DuracaoMaximaReservaMinutos = espacoComum.DuracaoMaximaReservaMinutos,
                LimiteReservasPorMesPorUnidade = espacoComum.LimiteReservasPorMesPorUnidade,
                TaxaReserva = espacoComum.TaxaReserva,
                HorariosPermitidosJson = espacoComum.HorariosPermitidosJson,
                DiasBloqueadosJson = espacoComum.DiasBloqueadosJson,
                ExibirNoMural = espacoComum.ExibirNoMural,
                TermoDeUso = espacoComum.TermoDeUso,
                AntecedenciaMinimaCancelamentoHoras = espacoComum.AntecedenciaMinimaCancelamentoHoras
                // RegrasFormatadas = null // This would require logic to parse JSONs and populate
            };
        }
    }
}
