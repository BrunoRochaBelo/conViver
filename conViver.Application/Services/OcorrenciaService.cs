using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using conViver.Core.DTOs;
using conViver.Core.Entities;
using conViver.Core.Enums;
using conViver.Core.Interfaces;
using CoreFileStorageService = conViver.Core.Interfaces.IFileStorageService;
using FluentValidation;

namespace conViver.Application.Services
{
    public class OcorrenciaService : IOcorrenciaService
    {
        private readonly IOcorrenciaRepository _ocorrenciaRepository;
        private readonly IRepository<Usuario> _usuarioRepository;
        private readonly CoreFileStorageService _fileStorageService;
        private readonly IValidator<OcorrenciaInputDto> _ocorrenciaInputValidator;
        private readonly IValidator<OcorrenciaComentarioInputDto> _comentarioInputValidator;
        private readonly IValidator<OcorrenciaStatusInputDto> _statusInputValidator;

        public OcorrenciaService(
            IOcorrenciaRepository ocorrenciaRepository,
            IRepository<Usuario> usuarioRepository,
            CoreFileStorageService fileStorageService,
            IValidator<OcorrenciaInputDto> ocorrenciaInputValidator,
            IValidator<OcorrenciaComentarioInputDto> comentarioInputValidator,
            IValidator<OcorrenciaStatusInputDto> statusInputValidator
        )
        {
            _ocorrenciaRepository = ocorrenciaRepository;
            _usuarioRepository = usuarioRepository;
            _fileStorageService = fileStorageService;
            _ocorrenciaInputValidator = ocorrenciaInputValidator;
            _comentarioInputValidator = comentarioInputValidator;
            _statusInputValidator = statusInputValidator;
        }

        public async Task<OcorrenciaDetailsDto> CreateOcorrenciaAsync(
            OcorrenciaInputDto inputDto,
            Guid userId,
            IEnumerable<AnexoInput> anexos)
        {
            var validationResult = await _ocorrenciaInputValidator.ValidateAsync(inputDto);
            if (!validationResult.IsValid)
                throw new ValidationException(validationResult.Errors);

            var usuario = await _usuarioRepository.GetByIdAsync(userId);
            if (usuario == null)
                throw new KeyNotFoundException("Usuário não encontrado.");

            var ocorrencia = new Ocorrencia
            {
                Id = Guid.NewGuid(),
                UsuarioId = userId,
                Titulo = inputDto.Titulo,
                Descricao = inputDto.Descricao,
                Categoria = inputDto.Categoria,
                Prioridade = inputDto.Prioridade,
                Status = OcorrenciaStatus.ABERTA,
                DataAbertura = DateTime.UtcNow,
                DataAtualizacao = DateTime.UtcNow,
                CondominioId = usuario.Unidade?.CondominioId ?? Guid.Empty,
                UnidadeId = usuario.UnidadeId
            };

            if (anexos != null && anexos.Any())
            {
                ocorrencia.Anexos = new List<OcorrenciaAnexo>();
                foreach (var anexoInput in anexos)
                {
                    var url = await _fileStorageService.UploadFileAsync(
                        "ocorrencias-anexos",
                        anexoInput.FileName,
                        anexoInput.ContentStream,
                        anexoInput.ContentType);

                    ocorrencia.Anexos.Add(new OcorrenciaAnexo
                    {
                        Id = Guid.NewGuid(),
                        OcorrenciaId = ocorrencia.Id,
                        Url = url,
                        NomeArquivo = anexoInput.FileName,
                        Tipo = anexoInput.ContentType,
                        Tamanho = anexoInput.ContentStream.Length
                    });
                }
            }

            ocorrencia.HistoricoStatus = new List<OcorrenciaStatusHistorico>
            {
                new OcorrenciaStatusHistorico
                {
                    Id = Guid.NewGuid(),
                    OcorrenciaId = ocorrencia.Id,
                    Status = OcorrenciaStatus.ABERTA,
                    AlteradoPorId = userId,
                    Data = ocorrencia.DataAbertura
                }
            };

            await _ocorrenciaRepository.AddAsync(ocorrencia);

            var created = await _ocorrenciaRepository.GetByIdWithDetailsAsync(ocorrencia.Id);
            return MapToDetailsDto(created!);
        }

        public async Task<PagedResultDto<OcorrenciaListItemDto>> GetOcorrenciasAsync(
            OcorrenciaQueryParametersDto queryParams,
            Guid userId,
            bool isAdminOrSindico)
        {
            var paged = await _ocorrenciaRepository
                .GetOcorrenciasFilteredAndPaginatedAsync(queryParams, userId, isAdminOrSindico);

            var items = paged.Items.Select(MapToListItemDto).ToList();
            return new PagedResultDto<OcorrenciaListItemDto>
            {
                Items = items,
                TotalCount = paged.TotalCount,
                PageNumber = paged.PageNumber,
                PageSize = paged.PageSize
            };
        }

        public async Task<OcorrenciaDetailsDto> GetOcorrenciaByIdAsync(Guid id, Guid userId)
        {
            var ocorrencia = await _ocorrenciaRepository.GetByIdWithDetailsAsync(id);
            if (ocorrencia == null)
                throw new KeyNotFoundException($"Ocorrência com ID {id} não encontrada.");

            return MapToDetailsDto(ocorrencia);
        }

        public async Task<IEnumerable<OcorrenciaListItemDto>> ListarOcorrenciasPorUsuarioAsync(
            Guid condominioId,
            Guid usuarioId,
            OcorrenciaStatus? status,
            OcorrenciaCategoria? categoria)
        {
            var queryParams = new OcorrenciaQueryParametersDto
            {
                Status = status,
                Categoria = categoria,
                Minha = true,
                Pagina = 1,
                TamanhoPagina = int.MaxValue
            };

            var paged = await _ocorrenciaRepository
                .GetOcorrenciasFilteredAndPaginatedAsync(queryParams, usuarioId, true);

            return paged.Items
                .Where(o => o.CondominioId == condominioId)
                .Select(MapToListItemDto)
                .ToList();
        }

        public async Task<OcorrenciaComentarioDto> AddComentarioAsync(
            Guid ocorrenciaId,
            OcorrenciaComentarioInputDto dto,
            Guid userId)
        {
            var validation = await _comentarioInputValidator.ValidateAsync(dto);
            if (!validation.IsValid)
                throw new ValidationException(validation.Errors);

            var ocorrencia = await _ocorrenciaRepository.GetByIdAsync(ocorrenciaId);
            if (ocorrencia == null)
                throw new KeyNotFoundException($"Ocorrência com ID {ocorrenciaId} não encontrada.");

            var comentario = new OcorrenciaComentario
            {
                Id = Guid.NewGuid(),
                OcorrenciaId = ocorrenciaId,
                UsuarioId = userId,
                Texto = dto.Texto,
                Data = DateTime.UtcNow
            };

            await _ocorrenciaRepository.AddComentarioAsync(comentario);

            ocorrencia.DataAtualizacao = DateTime.UtcNow;
            await _ocorrenciaRepository.UpdateAsync(ocorrencia);

            var usuario = await _usuarioRepository.GetByIdAsync(userId);
            return new OcorrenciaComentarioDto
            {
                Id = comentario.Id,
                UsuarioId = comentario.UsuarioId,
                UsuarioNome = usuario?.Nome ?? string.Empty,
                Texto = comentario.Texto,
                Data = comentario.Data
            };
        }

        public async Task<bool> ChangeOcorrenciaStatusAsync(
            Guid id,
            OcorrenciaStatusInputDto dto,
            Guid userId)
        {
            var validation = await _statusInputValidator.ValidateAsync(dto);
            if (!validation.IsValid)
                throw new ValidationException(validation.Errors);

            var ocorrencia = await _ocorrenciaRepository.GetByIdAsync(id);
            if (ocorrencia == null)
                throw new KeyNotFoundException($"Ocorrência com ID {id} não encontrada.");

            if (ocorrencia.Status == dto.Status) return true;

            ocorrencia.Status = dto.Status;
            ocorrencia.DataAtualizacao = DateTime.UtcNow;

            await _ocorrenciaRepository.AddStatusHistoricoAsync(new OcorrenciaStatusHistorico
            {
                Id = Guid.NewGuid(),
                OcorrenciaId = id,
                Status = dto.Status,
                AlteradoPorId = userId,
                Data = DateTime.UtcNow
            });

            await _ocorrenciaRepository.UpdateAsync(ocorrencia);
            return true;
        }

        public async Task AddAnexosAsync(
            Guid id,
            IEnumerable<AnexoInput> anexos,
            Guid userId)
        {
            if (anexos == null || !anexos.Any()) return;

            var ocorrencia = await _ocorrenciaRepository.GetByIdAsync(id);
            if (ocorrencia == null)
                throw new KeyNotFoundException($"Ocorrência com ID {id} não encontrada.");

            var novos = new List<OcorrenciaAnexo>();
            foreach (var anexo in anexos)
            {
                var url = await _fileStorageService.UploadFileAsync(
                    "ocorrencias-anexos",
                    anexo.FileName,
                    anexo.ContentStream,
                    anexo.ContentType);

                novos.Add(new OcorrenciaAnexo
                {
                    Id = Guid.NewGuid(),
                    OcorrenciaId = id,
                    Url = url,
                    NomeArquivo = anexo.FileName,
                    Tipo = anexo.ContentType,
                    Tamanho = anexo.ContentStream.Length
                });
            }

            await _ocorrenciaRepository.AddAnexosAsync(novos);
            ocorrencia.DataAtualizacao = DateTime.UtcNow;
            await _ocorrenciaRepository.UpdateAsync(ocorrencia);
        }

        public async Task<IEnumerable<OcorrenciaStatusHistoricoDto>> GetStatusHistoricoAsync(Guid id)
        {
            var historico = await _ocorrenciaRepository
                .GetStatusHistoricoByOcorrenciaIdAsync(id);
            return historico.Select(MapToStatusHistoricoDto).ToList();
        }

        public async Task<bool> DeleteOcorrenciaAsync(Guid id, Guid userId)
        {
            var ocorrencia = await _ocorrenciaRepository.GetByIdWithDetailsAsync(id);
            if (ocorrencia == null)
                throw new KeyNotFoundException($"Ocorrência com ID {id} não encontrada.");

            if (ocorrencia.Anexos != null)
            {
                foreach (var anexo in ocorrencia.Anexos)
                    await _fileStorageService.DeleteFileAsync(anexo.Url);
            }

            await _ocorrenciaRepository.DeleteAsync(ocorrencia);
            return true;
        }

        public Task<IEnumerable<string>> GetCategoriasAsync()
        {
            var list = Enum.GetNames(typeof(OcorrenciaCategoria)).ToList();
            return Task.FromResult<IEnumerable<string>>(list);
        }

        private static OcorrenciaAnexoDto MapToAnexoDto(OcorrenciaAnexo anexo) => new OcorrenciaAnexoDto
        {
            Id = anexo.Id,
            Url = anexo.Url,
            NomeArquivo = anexo.NomeArquivo,
            Tipo = anexo.Tipo,
            Tamanho = anexo.Tamanho
        };

        private static OcorrenciaStatusHistoricoDto MapToStatusHistoricoDto(OcorrenciaStatusHistorico h) => new OcorrenciaStatusHistoricoDto
        {
            Status = h.Status.ToString(),
            Data = h.Data,
            AlteradoPorNome = h.AlteradoPor?.Nome ?? string.Empty
        };

        private static OcorrenciaComentarioDto MapToComentarioDto(OcorrenciaComentario c) => new OcorrenciaComentarioDto
        {
            Id = c.Id,
            UsuarioId = c.UsuarioId,
            UsuarioNome = c.Usuario?.Nome ?? string.Empty,
            Texto = c.Texto,
            Data = c.Data
        };

        private static OcorrenciaListItemDto MapToListItemDto(Ocorrencia o) => new OcorrenciaListItemDto
        {
            Id = o.Id,
            Titulo = o.Titulo,
            Categoria = o.Categoria.ToString(),
            Status = o.Status.ToString(),
            Prioridade = o.Prioridade.ToString(),
            DataAbertura = o.DataAbertura,
            DataAtualizacao = o.DataAtualizacao,
            NomeUsuario = o.Usuario?.Nome ?? string.Empty
        };

        private static OcorrenciaDetailsDto MapToDetailsDto(Ocorrencia o) => new OcorrenciaDetailsDto
        {
            Id = o.Id,
            Titulo = o.Titulo,
            Descricao = o.Descricao,
            Categoria = o.Categoria.ToString(),
            Status = o.Status.ToString(),
            Prioridade = o.Prioridade.ToString(),
            DataAbertura = o.DataAbertura,
            DataAtualizacao = o.DataAtualizacao,
            Usuario = new OcorrenciaUsuarioInfoDto
            {
                Id = o.UsuarioId,
                Nome = o.Usuario?.Nome ?? string.Empty,
                Unidade = o.Unidade?.Identificacao ?? string.Empty
            },
            Anexos = o.Anexos?.Select(MapToAnexoDto).ToList() ?? new List<OcorrenciaAnexoDto>(),
            HistoricoStatus = o.HistoricoStatus?.Select(MapToStatusHistoricoDto).ToList() ?? new List<OcorrenciaStatusHistoricoDto>(),
            Comentarios = o.Comentarios?.Select(MapToComentarioDto).ToList() ?? new List<OcorrenciaComentarioDto>()
        };
    }
}
