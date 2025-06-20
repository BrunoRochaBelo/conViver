using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper; // Assuming AutoMapper is used
using conViver.Core.DTOs;
using conViver.Core.Entities;
using conViver.Core.Enums;
using conViver.Core.Interfaces;
using FluentValidation; // For IValidator
// Assuming custom exceptions exist, e.g., NotFoundException, ForbiddenException
// using conViver.Core.Exceptions;

namespace conViver.Application.Services
{
    public class OcorrenciaService : IOcorrenciaService
    {
        private readonly IOcorrenciaRepository _ocorrenciaRepository;
        private readonly IUsuarioRepository _usuarioRepository; // Assuming this exists
        private readonly IFileStorageService _fileStorageService;
        private readonly IMapper _mapper; // Assuming AutoMapper
        private readonly IValidator<OcorrenciaInputDto> _ocorrenciaInputValidator;
        private readonly IValidator<OcorrenciaComentarioInputDto> _comentarioInputValidator;
        private readonly IValidator<OcorrenciaStatusInputDto> _statusInputValidator;
        // private readonly IUnitOfWork _unitOfWork; // If using Unit of Work pattern for SaveChangesAsync

        public OcorrenciaService(
            IOcorrenciaRepository ocorrenciaRepository,
            IUsuarioRepository usuarioRepository,
            IFileStorageService fileStorageService,
            IMapper mapper,
            IValidator<OcorrenciaInputDto> ocorrenciaInputValidator,
            IValidator<OcorrenciaComentarioInputDto> comentarioInputValidator,
            IValidator<OcorrenciaStatusInputDto> statusInputValidator
            // IUnitOfWork unitOfWork
            )
        {
            _ocorrenciaRepository = ocorrenciaRepository;
            _usuarioRepository = usuarioRepository;
            _fileStorageService = fileStorageService;
            _mapper = mapper;
            _ocorrenciaInputValidator = ocorrenciaInputValidator;
            _comentarioInputValidator = comentarioInputValidator;
            _statusInputValidator = statusInputValidator;
            // _unitOfWork = unitOfWork;
        }

        public async Task<OcorrenciaDetailsDto> CreateOcorrenciaAsync(OcorrenciaInputDto inputDto, Guid userId, IEnumerable<AnexoInput> anexos)
        {
            var validationResult = await _ocorrenciaInputValidator.ValidateAsync(inputDto);
            if (!validationResult.IsValid)
            {
                throw new ValidationException(validationResult.Errors);
            }

            var usuario = await _usuarioRepository.GetByIdAsync(userId);
            if (usuario == null)
            {
                // Consider a more specific exception or error handling
                throw new KeyNotFoundException("Usuário não encontrado.");
            }

            var ocorrencia = _mapper.Map<Ocorrencia>(inputDto);
            ocorrencia.Id = Guid.NewGuid();
            ocorrencia.UsuarioId = userId;
            ocorrencia.Status = OcorrenciaStatus.ABERTA;
            ocorrencia.DataAbertura = DateTime.UtcNow;
            ocorrencia.DataAtualizacao = DateTime.UtcNow;
            ocorrencia.CondominioId = usuario.CondominioId; // Assuming Usuario has CondominioId
            ocorrencia.UnidadeId = usuario.UnidadeId; // Assuming Usuario has UnidadeId

            if (anexos != null && anexos.Any())
            {
                ocorrencia.Anexos = new List<OcorrenciaAnexo>();
                foreach (var anexoInput in anexos)
                {
                    var anexoUrl = await _fileStorageService.UploadFileAsync(
                        "ocorrencias-anexos", // Container name
                        anexoInput.FileName,
                        anexoInput.ContentStream,
                        anexoInput.ContentType
                    );

                    var ocorrenciaAnexo = new OcorrenciaAnexo
                    {
                        Id = Guid.NewGuid(),
                        OcorrenciaId = ocorrencia.Id,
                        Url = anexoUrl,
                        NomeArquivo = anexoInput.FileName,
                        Tipo = anexoInput.ContentType,
                        Tamanho = anexoInput.ContentStream.Length // Note: Stream might be consumed or length not available after read
                    };
                    ocorrencia.Anexos.Add(ocorrenciaAnexo);
                }
            }

            // Initial status history
            var initialStatus = new OcorrenciaStatusHistorico
            {
                Id = Guid.NewGuid(),
                OcorrenciaId = ocorrencia.Id,
                Status = OcorrenciaStatus.ABERTA,
                AlteradoPorId = userId,
                Data = ocorrencia.DataAbertura
            };
            ocorrencia.HistoricoStatus = new List<OcorrenciaStatusHistorico> { initialStatus };

            await _ocorrenciaRepository.AddAsync(ocorrencia);
            // await _unitOfWork.SaveChangesAsync(); // If using UoW

            // Fetch details for the response
            var createdOcorrencia = await _ocorrenciaRepository.GetByIdWithDetailsAsync(ocorrencia.Id);
            return _mapper.Map<OcorrenciaDetailsDto>(createdOcorrencia);
        }

        public async Task<PagedResultDto<OcorrenciaListItemDto>> GetOcorrenciasAsync(OcorrenciaQueryParametersDto queryParams, Guid userId, bool isAdminOrSindico)
        {
            // The repository method GetOcorrenciasFilteredAndPaginatedAsync already takes queryParams, userId, and isAdminOrSindico.
            // So, the primary role here is to call it and map the results.
            // Permission logic (what a user can see) should be mostly handled by the repository or refined here if needed.

            var pagedOcorrencias = await _ocorrenciaRepository.GetOcorrenciasFilteredAndPaginatedAsync(queryParams, userId, isAdminOrSindico);

            // Map entities to DTOs
            var itemsDto = _mapper.Map<List<OcorrenciaListItemDto>>(pagedOcorrencias.Items);

            return new PagedResultDto<OcorrenciaListItemDto>
            {
                Items = itemsDto,
                TotalCount = pagedOcorrencias.TotalCount,
                PageNumber = pagedOcorrencias.PageNumber,
                PageSize = pagedOcorrencias.PageSize
            };
        }

        public async Task<OcorrenciaDetailsDto> GetOcorrenciaByIdAsync(Guid id, Guid userId)
        {
            var ocorrencia = await _ocorrenciaRepository.GetByIdWithDetailsAsync(id);
            if (ocorrencia == null)
            {
                throw new KeyNotFoundException($"Ocorrência com ID {id} não encontrada.");
            }

            // Basic permission check: user is owner or admin/sindico (assuming isAdminOrSindico can be determined)
            // bool isAdminOrSindico = await _usuarioRepository.IsAdminOrSindicoAsync(userId); // Example
            // if (ocorrencia.UsuarioId != userId && !isAdminOrSindico)
            // {
            //    throw new ForbiddenException("Você não tem permissão para ver esta ocorrência.");
            // }
            // For now, assume permission check might happen in controller or isAdminOrSindico is passed in.
            // If not, this is a simplified version.

            return _mapper.Map<OcorrenciaDetailsDto>(ocorrencia);
        }

        public async Task<OcorrenciaComentarioDto> AddComentarioAsync(Guid ocorrenciaId, OcorrenciaComentarioInputDto comentarioDto, Guid userId)
        {
            var validationResult = await _comentarioInputValidator.ValidateAsync(comentarioDto);
            if (!validationResult.IsValid)
            {
                throw new ValidationException(validationResult.Errors);
            }

            var ocorrencia = await _ocorrenciaRepository.GetByIdAsync(ocorrenciaId);
            if (ocorrencia == null)
            {
                throw new KeyNotFoundException($"Ocorrência com ID {ocorrenciaId} não encontrada.");
            }

            // Permission to comment (e.g., owner, admin/sindico, or involved parties)
            // bool isAdminOrSindico = await _usuarioRepository.IsAdminOrSindicoAsync(userId);
            // if (ocorrencia.UsuarioId != userId && !isAdminOrSindico)
            // {
            //     throw new ForbiddenException("Você não tem permissão para comentar nesta ocorrência.");
            // }

            var comentario = new OcorrenciaComentario
            {
                Id = Guid.NewGuid(),
                OcorrenciaId = ocorrenciaId,
                UsuarioId = userId,
                Texto = comentarioDto.Texto,
                Data = DateTime.UtcNow
            };

            await _ocorrenciaRepository.AddComentarioAsync(comentario);

            ocorrencia.DataAtualizacao = DateTime.UtcNow;
            await _ocorrenciaRepository.UpdateAsync(ocorrencia); // To update DataAtualizacao
            // await _unitOfWork.SaveChangesAsync();

            // To return OcorrenciaComentarioDto, we need user name.
            var usuario = await _usuarioRepository.GetByIdAsync(userId);
            var resultDto = _mapper.Map<OcorrenciaComentarioDto>(comentario);
            // Manual mapping if Usuario object is not directly on comentario or mapper is not configured for this specific case
             if (usuario != null && resultDto != null) resultDto.UsuarioNome = usuario.Nome;


            return resultDto;
        }

        public async Task<bool> ChangeOcorrenciaStatusAsync(Guid ocorrenciaId, OcorrenciaStatusInputDto statusDto, Guid userId)
        {
            var validationResult = await _statusInputValidator.ValidateAsync(statusDto);
            if (!validationResult.IsValid)
            {
                throw new ValidationException(validationResult.Errors);
            }

            var ocorrencia = await _ocorrenciaRepository.GetByIdAsync(ocorrenciaId);
            if (ocorrencia == null)
            {
                throw new KeyNotFoundException($"Ocorrência com ID {ocorrenciaId} não encontrada.");
            }

            // Permission to change status (typically admin/sindico)
            // bool isAdminOrSindico = await _usuarioRepository.IsAdminOrSindicoAsync(userId);
            // if (!isAdminOrSindico)
            // {
            //     throw new ForbiddenException("Você não tem permissão para alterar o status desta ocorrência.");
            // }

            if (ocorrencia.Status == statusDto.Status) return true; // No change

            ocorrencia.Status = statusDto.Status;
            ocorrencia.DataAtualizacao = DateTime.UtcNow;

            var statusHistorico = new OcorrenciaStatusHistorico
            {
                Id = Guid.NewGuid(),
                OcorrenciaId = ocorrenciaId,
                Status = statusDto.Status,
                AlteradoPorId = userId,
                Data = DateTime.UtcNow
            };

            await _ocorrenciaRepository.AddStatusHistoricoAsync(statusHistorico);
            await _ocorrenciaRepository.UpdateAsync(ocorrencia);
            // await _unitOfWork.SaveChangesAsync();

            return true;
        }

        public async Task AddAnexosAsync(Guid ocorrenciaId, IEnumerable<AnexoInput> anexos, Guid userId)
        {
            if (anexos == null || !anexos.Any()) return;

            var ocorrencia = await _ocorrenciaRepository.GetByIdAsync(ocorrenciaId);
            if (ocorrencia == null)
            {
                throw new KeyNotFoundException($"Ocorrência com ID {ocorrenciaId} não encontrada.");
            }

            // Permission check (e.g., owner or admin/sindico)
            // bool isAdminOrSindico = await _usuarioRepository.IsAdminOrSindicoAsync(userId);
            // if (ocorrencia.UsuarioId != userId && !isAdminOrSindico)
            // {
            //     throw new ForbiddenException("Você não tem permissão para adicionar anexos a esta ocorrência.");
            // }

            var novosAnexos = new List<OcorrenciaAnexo>();
            foreach (var anexoInput in anexos)
            {
                var anexoUrl = await _fileStorageService.UploadFileAsync(
                    "ocorrencias-anexos",
                    anexoInput.FileName,
                    anexoInput.ContentStream,
                    anexoInput.ContentType
                );
                novosAnexos.Add(new OcorrenciaAnexo
                {
                    Id = Guid.NewGuid(),
                    OcorrenciaId = ocorrenciaId,
                    Url = anexoUrl,
                    NomeArquivo = anexoInput.FileName,
                    Tipo = anexoInput.ContentType,
                    Tamanho = anexoInput.ContentStream.Length // Subject to same stream length caveat
                });
            }

            if (novosAnexos.Any())
            {
                await _ocorrenciaRepository.AddAnexosAsync(novosAnexos);
                ocorrencia.DataAtualizacao = DateTime.UtcNow;
                await _ocorrenciaRepository.UpdateAsync(ocorrencia);
                // await _unitOfWork.SaveChangesAsync();
            }
        }

        public async Task<IEnumerable<OcorrenciaStatusHistoricoDto>> GetStatusHistoricoAsync(Guid ocorrenciaId)
        {
            var historico = await _ocorrenciaRepository.GetStatusHistoricoByOcorrenciaIdAsync(ocorrenciaId);
            return _mapper.Map<List<OcorrenciaStatusHistoricoDto>>(historico);
        }

        public async Task<bool> DeleteOcorrenciaAsync(Guid ocorrenciaId, Guid userId)
        {
            var ocorrencia = await _ocorrenciaRepository.GetByIdWithDetailsAsync(ocorrenciaId); // Get details for anexos
            if (ocorrencia == null)
            {
                throw new KeyNotFoundException($"Ocorrência com ID {ocorrenciaId} não encontrada.");
            }

            // Permission check (e.g., admin/sindico)
            // bool isAdminOrSindico = await _usuarioRepository.IsAdminOrSindicoAsync(userId);
            // if (!isAdminOrSindico)
            // {
            //     throw new ForbiddenException("Você não tem permissão para excluir esta ocorrência.");
            // }

            // Delete associated files
            if (ocorrencia.Anexos != null)
            {
                foreach (var anexo in ocorrencia.Anexos)
                {
                    await _fileStorageService.DeleteFileAsync(anexo.Url);
                }
            }

            // Note: OcorrenciaAnexos, OcorrenciaComentarios, OcorrenciaStatusHistoricos are configured with Cascade delete
            // in DbContext, so they should be deleted automatically by the database when Ocorrencia is deleted.
            // If not, manual deletion would be needed here.
            await _ocorrenciaRepository.DeleteAsync(ocorrencia);
            // await _unitOfWork.SaveChangesAsync();

            return true;
        }

        public Task<IEnumerable<string>> GetCategoriasAsync()
        {
            var categorias = Enum.GetNames(typeof(OcorrenciaCategoria))
                                 .Select(c => c.ToString())
                                 .ToList();
            return Task.FromResult<IEnumerable<string>>(categorias);
        }
    }
}
