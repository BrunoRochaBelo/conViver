using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using conViver.Core.DTOs;
using conViver.Core.Entities;
using conViver.Core.Enums;
using conViver.Core.Interfaces;
using FluentValidation;

namespace conViver.Application.Services
{
    public class OcorrenciaService : IOcorrenciaService
    {
        private readonly IOcorrenciaRepository _ocorrenciaRepository;
        private readonly IUsuarioRepository _usuarioRepository;
        private readonly IFileStorageService _fileStorageService;
        private readonly IMapper _mapper;
        private readonly IValidator<OcorrenciaInputDto> _ocorrenciaInputValidator;
        private readonly IValidator<OcorrenciaComentarioInputDto> _comentarioInputValidator;
        private readonly IValidator<OcorrenciaStatusInputDto> _statusInputValidator;

        public OcorrenciaService(
            IOcorrenciaRepository ocorrenciaRepository,
            IUsuarioRepository usuarioRepository,
            IFileStorageService fileStorageService,
            IMapper mapper,
            IValidator<OcorrenciaInputDto> ocorrenciaInputValidator,
            IValidator<OcorrenciaComentarioInputDto> comentarioInputValidator,
            IValidator<OcorrenciaStatusInputDto> statusInputValidator
        )
        {
            _ocorrenciaRepository = ocorrenciaRepository;
            _usuarioRepository = usuarioRepository;
            _fileStorageService = fileStorageService;
            _mapper = mapper;
            _ocorrenciaInputValidator = ocorrenciaInputValidator;
            _comentarioInputValidator = comentarioInputValidator;
            _statusInputValidator = statusInputValidator;
        }

        public async Task<OcorrenciaDetailsDto> CreateOcorrenciaAsync(OcorrenciaInputDto inputDto, Guid userId, IEnumerable<AnexoInput> anexos)
        {
            var validationResult = await _ocorrenciaInputValidator.ValidateAsync(inputDto);
            if (!validationResult.IsValid)
                throw new ValidationException(validationResult.Errors);

            var usuario = await _usuarioRepository.GetByIdAsync(userId);
            if (usuario == null)
                throw new KeyNotFoundException("Usuário não encontrado.");

            var ocorrencia = _mapper.Map<Ocorrencia>(inputDto);
            ocorrencia.Id = Guid.NewGuid();
            ocorrencia.UsuarioId = userId;
            ocorrencia.Status = OcorrenciaStatus.ABERTA;
            ocorrencia.DataAbertura = DateTime.UtcNow;
            ocorrencia.DataAtualizacao = DateTime.UtcNow;
            ocorrencia.CondominioId = usuario.CondominioId;
            ocorrencia.UnidadeId = usuario.UnidadeId;

            if (anexos != null && anexos.Any())
            {
                ocorrencia.Anexos = new List<OcorrenciaAnexo>();
                foreach (var anexoInput in anexos)
                {
                    var anexoUrl = await _fileStorageService.UploadFileAsync(
                        "ocorrencias-anexos",
                        anexoInput.FileName,
                        anexoInput.ContentStream,
                        anexoInput.ContentType
                    );

                    ocorrencia.Anexos.Add(new OcorrenciaAnexo
                    {
                        Id = Guid.NewGuid(),
                        OcorrenciaId = ocorrencia.Id,
                        Url = anexoUrl,
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
            return _mapper.Map<OcorrenciaDetailsDto>(created);
        }

        public async Task<PagedResultDto<OcorrenciaListItemDto>> GetOcorrenciasAsync(OcorrenciaQueryParametersDto queryParams, Guid userId, bool isAdminOrSindico)
        {
            var paged = await _ocorrenciaRepository.GetOcorrenciasFilteredAndPaginatedAsync(queryParams, userId, isAdminOrSindico);
            var items = _mapper.Map<List<OcorrenciaListItemDto>>(paged.Items);

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

            return _mapper.Map<OcorrenciaDetailsDto>(ocorrencia);
        }

        public async Task<OcorrenciaComentarioDto> AddComentarioAsync(Guid ocorrenciaId, OcorrenciaComentarioInputDto dto, Guid userId)
        {
            var validationResult = await _comentarioInputValidator.ValidateAsync(dto);
            if (!validationResult.IsValid)
                throw new ValidationException(validationResult.Errors);

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
            var resultDto = _mapper.Map<OcorrenciaComentarioDto>(comentario);
            if (usuario != null) resultDto.UsuarioNome = usuario.Nome;

            return resultDto;
        }

        public async Task<bool> ChangeOcorrenciaStatusAsync(Guid id, OcorrenciaStatusInputDto dto, Guid userId)
        {
            var validationResult = await _statusInputValidator.ValidateAsync(dto);
            if (!validationResult.IsValid)
                throw new ValidationException(validationResult.Errors);

            var ocorrencia = await _ocorrenciaRepository.GetByIdAsync(id);
            if (ocorrencia == null)
                throw new KeyNotFoundException($"Ocorrência com ID {id} não encontrada.");

            if (ocorrencia.Status == dto.Status)
                return true;

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

        public async Task AddAnexosAsync(Guid id, IEnumerable<AnexoInput> anexos, Guid userId)
        {
            if (anexos == null || !anexos.Any()) return;

            var ocorrencia = await _ocorrenciaRepository.GetByIdAsync(id);
            if (ocorrencia == null)
                throw new KeyNotFoundException($"Ocorrência com ID {id} não encontrada.");

            var novosAnexos = new List<OcorrenciaAnexo>();
            foreach (var anexo in anexos)
            {
                var url = await _fileStorageService.UploadFileAsync("ocorrencias-anexos", anexo.FileName, anexo.ContentStream, anexo.ContentType);

                novosAnexos.Add(new OcorrenciaAnexo
                {
                    Id = Guid.NewGuid(),
                    OcorrenciaId = id,
                    Url = url,
                    NomeArquivo = anexo.FileName,
                    Tipo = anexo.ContentType,
                    Tamanho = anexo.ContentStream.Length
                });
            }

            await _ocorrenciaRepository.AddAnexosAsync(novosAnexos);
            ocorrencia.DataAtualizacao = DateTime.UtcNow;
            await _ocorrenciaRepository.UpdateAsync(ocorrencia);
        }

        public async Task<IEnumerable<OcorrenciaStatusHistoricoDto>> GetStatusHistoricoAsync(Guid id)
        {
            var historico = await _ocorrenciaRepository.GetStatusHistoricoByOcorrenciaIdAsync(id);
            return _mapper.Map<List<OcorrenciaStatusHistoricoDto>>(historico);
        }

        public async Task<bool> DeleteOcorrenciaAsync(Guid id, Guid userId)
        {
            var ocorrencia = await _ocorrenciaRepository.GetByIdWithDetailsAsync(id);
            if (ocorrencia == null)
                throw new KeyNotFoundException($"Ocorrência com ID {id} não encontrada.");

            if (ocorrencia.Anexos != null)
            {
                foreach (var anexo in ocorrencia.Anexos)
                {
                    await _fileStorageService.DeleteFileAsync(anexo.Url);
                }
            }

            await _ocorrenciaRepository.DeleteAsync(ocorrencia);
            return true;
        }

        public Task<IEnumerable<string>> GetCategoriasAsync()
        {
            var categorias = Enum.GetNames(typeof(OcorrenciaCategoria)).ToList();
            return Task.FromResult<IEnumerable<string>>(categorias);
        }
    }
}
