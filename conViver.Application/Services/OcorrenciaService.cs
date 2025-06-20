using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using conViver.Core.DTOs;
using conViver.Core.Entities;
using conViver.Core.Interfaces;
using Microsoft.EntityFrameworkCore; // Added for ToListAsync

namespace conViver.Application.Services
{
    public class OcorrenciaService
    {
        private readonly IRepository<Ocorrencia> _ocorrenciaRepository;
        // private readonly INotificacaoService _notificacaoService; // Assuming you might have a notification service

        public OcorrenciaService(IRepository<Ocorrencia> ocorrenciaRepository /*, INotificacaoService notificacaoService*/)
        {
            _ocorrenciaRepository = ocorrenciaRepository;
            // _notificacaoService = notificacaoService;
        }

        public async Task<Ocorrencia> RegistrarOcorrenciaAsync(Guid condominioId, Guid usuarioId, OcorrenciaInputDto input, CancellationToken ct = default)
        {
            var ocorrencia = new Ocorrencia
            {
                Id = Guid.NewGuid(),
                CondominioId = condominioId,
                UsuarioId = usuarioId,
                UnidadeId = input.UnidadeId,
                Titulo = input.Titulo,
                Descricao = input.Descricao,
                Fotos = input.Fotos ?? new List<string>(),
                Tipo = input.Tipo,
                DataOcorrencia = input.DataOcorrencia,
                Status = "Registrada", // Initial status
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _ocorrenciaRepository.AddAsync(ocorrencia, ct);
            // Potentially send notifications after creating
            // await _notificacaoService.NotificarNovaOcorrenciaAsync(ocorrencia);
            return ocorrencia;
        }

        public async Task<IEnumerable<OcorrenciaDto>> ListarOcorrenciasPorUsuarioAsync(Guid condominioId, Guid usuarioId, string? status, string? tipo, CancellationToken ct = default)
        {
            var query = _ocorrenciaRepository.Query()
                .Where(o => o.CondominioId == condominioId && o.UsuarioId == usuarioId);

            if (!string.IsNullOrEmpty(status))
            {
                query = query.Where(o => o.Status == status);
            }

            if (!string.IsNullOrEmpty(tipo))
            {
                query = query.Where(o => o.Tipo == tipo);
            }

            var ocorrencias = await query.ToListAsync(ct); // Changed to use ToListAsync
            return ocorrencias.Select(MapToOcorrenciaDto);
        }

        public async Task<IEnumerable<OcorrenciaDto>> ListarOcorrenciasParaGestaoAsync(Guid condominioId, string? status, string? tipo, CancellationToken ct = default)
        {
            var query = _ocorrenciaRepository.Query()
                .Where(o => o.CondominioId == condominioId);

            if (!string.IsNullOrEmpty(status))
            {
                query = query.Where(o => o.Status == status);
            }

            if (!string.IsNullOrEmpty(tipo))
            {
                query = query.Where(o => o.Tipo == tipo);
            }

            var ocorrencias = await query.ToListAsync(ct); // Changed to use ToListAsync
            return ocorrencias.Select(MapToOcorrenciaDto);
        }

        public async Task<OcorrenciaDto?> ObterOcorrenciaPorIdAsync(Guid ocorrenciaId, Guid condominioId, Guid usuarioId, bool isGestor, CancellationToken ct = default)
        {
            var ocorrencia = await _ocorrenciaRepository.GetByIdAsync(ocorrenciaId, ct);

            if (ocorrencia == null || ocorrencia.CondominioId != condominioId)
            {
                return null; // Or throw NotFoundException
            }

            // If not a manager, user can only see their own occurrences
            if (!isGestor && ocorrencia.UsuarioId != usuarioId)
            {
                return null; // Or throw UnauthorizedAccessException
            }

            return MapToOcorrenciaDto(ocorrencia);
        }

        public async Task<OcorrenciaDto?> AtualizarOcorrenciaAsync(Guid ocorrenciaId, Guid condominioId, Guid gestorUserId, OcorrenciaUpdateDto updateDto, CancellationToken ct = default)
        {
            var ocorrencia = await _ocorrenciaRepository.GetByIdAsync(ocorrenciaId, ct);

            if (ocorrencia == null || ocorrencia.CondominioId != condominioId)
            {
                return null; // Or throw NotFoundException
            }

            // Logic to ensure only authorized personnel (e.g., admin/sindico) can update certain fields
            // This might involve checking gestorUserId against a list of authorized users or roles.
            // For now, we assume if this method is called, the user is authorized for simplicity.

            ocorrencia.Status = updateDto.Status;
            ocorrencia.RespostaAdministracao = updateDto.RespostaAdministracao;
            ocorrencia.UpdatedAt = DateTime.UtcNow;

            if (updateDto.Status == "Resolvida" || updateDto.Status == "Cancelada")
            {
                ocorrencia.DataResolucao = DateTime.UtcNow;
            }

            await _ocorrenciaRepository.UpdateAsync(ocorrencia, ct);
            // Potentially send notifications about the update
            // await _notificacaoService.NotificarOcorrenciaAtualizadaAsync(ocorrencia);
            return MapToOcorrenciaDto(ocorrencia);
        }

        private OcorrenciaDto MapToOcorrenciaDto(Ocorrencia ocorrencia)
        {
            return new OcorrenciaDto
            {
                Id = ocorrencia.Id,
                CondominioId = ocorrencia.CondominioId,
                UnidadeId = ocorrencia.UnidadeId,
                UsuarioId = ocorrencia.UsuarioId,
                Titulo = ocorrencia.Titulo,
                Descricao = ocorrencia.Descricao,
                Fotos = ocorrencia.Fotos,
                Status = ocorrencia.Status,
                Tipo = ocorrencia.Tipo,
                DataOcorrencia = ocorrencia.DataOcorrencia,
                DataResolucao = ocorrencia.DataResolucao,
                RespostaAdministracao = ocorrencia.RespostaAdministracao,
                CreatedAt = ocorrencia.CreatedAt,
                UpdatedAt = ocorrencia.UpdatedAt
            };
        }
    }
}
