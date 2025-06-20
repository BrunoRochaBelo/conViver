using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using conViver.Core.Entities;
using conViver.Core.DTOs; // Required for OcorrenciaQueryParametersDto

namespace conViver.Core.Interfaces
{
    public interface IOcorrenciaRepository // Assuming no generic IRepository<T> for now
    {
        Task<Ocorrencia> GetByIdAsync(Guid id);
        Task<Ocorrencia> GetByIdWithDetailsAsync(Guid id); // For eager loading
        Task<IEnumerable<Ocorrencia>> GetAllAsync(); // Basic GET all

        // A more specific method for filtered and paginated results,
        // which might be complex to define without knowing the exact capabilities of the ORM or data access strategy.
        // The OcorrenciaQueryParametersDto is defined, so the repository should be able to use it.
        Task<PagedResultDto<Ocorrencia>> GetOcorrenciasFilteredAndPaginatedAsync(OcorrenciaQueryParametersDto queryParams, Guid? userId, bool isAdminOrSindico);

        Task AddAsync(Ocorrencia ocorrencia);
        Task UpdateAsync(Ocorrencia ocorrencia);
        Task DeleteAsync(Ocorrencia ocorrencia);

        // Potentially other specific methods can be added here, for example:
        Task<IEnumerable<OcorrenciaStatusHistorico>> GetStatusHistoricoByOcorrenciaIdAsync(Guid ocorrenciaId);
        Task<IEnumerable<OcorrenciaComentario>> GetComentariosByOcorrenciaIdAsync(Guid ocorrenciaId);
        Task<IEnumerable<OcorrenciaAnexo>> GetAnexosByOcorrenciaIdAsync(Guid ocorrenciaId);
        Task AddComentarioAsync(OcorrenciaComentario comentario);
        Task AddStatusHistoricoAsync(OcorrenciaStatusHistorico statusHistorico);
        Task AddAnexoAsync(OcorrenciaAnexo anexo);
        // If Anexos are added in batch after Ocorrencia creation
        Task AddAnexosAsync(IEnumerable<OcorrenciaAnexo> anexos);
    }
}
