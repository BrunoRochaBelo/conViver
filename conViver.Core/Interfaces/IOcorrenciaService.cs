using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using conViver.Core.DTOs;

namespace conViver.Core.Interfaces
{
    public interface IOcorrenciaService
    {
        Task<OcorrenciaDetailsDto> CreateOcorrenciaAsync(OcorrenciaInputDto inputDto, Guid userId, IEnumerable<AnexoInput> anexos);
        Task<PagedResultDto<OcorrenciaListItemDto>> GetOcorrenciasAsync(OcorrenciaQueryParametersDto queryParams, Guid userId, bool isAdminOrSindico);
        Task<IEnumerable<OcorrenciaListItemDto>> ListarOcorrenciasPorUsuarioAsync(Guid condominioId, Guid usuarioId, OcorrenciaStatus? status, OcorrenciaCategoria? categoria);
        Task<OcorrenciaDetailsDto> GetOcorrenciaByIdAsync(Guid id, Guid userId);
        Task<OcorrenciaComentarioDto> AddComentarioAsync(Guid ocorrenciaId, OcorrenciaComentarioInputDto comentarioDto, Guid userId);
        Task<bool> ChangeOcorrenciaStatusAsync(Guid ocorrenciaId, OcorrenciaStatusInputDto statusDto, Guid userId);
        Task AddAnexosAsync(Guid ocorrenciaId, IEnumerable<AnexoInput> anexos, Guid userId);
        Task<IEnumerable<OcorrenciaStatusHistoricoDto>> GetStatusHistoricoAsync(Guid ocorrenciaId);
        Task<bool> DeleteOcorrenciaAsync(Guid ocorrenciaId, Guid userId);
        Task<IEnumerable<string>> GetCategoriasAsync();
    }
}
