using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using conViver.Core.DTOs;
using conViver.Core.Entities;
using conViver.Core.Interfaces;
using conViver.Infrastructure.Data.Contexts;
using Microsoft.EntityFrameworkCore;

namespace conViver.Infrastructure.Data.Repositories
{
    public class OcorrenciaRepository : IOcorrenciaRepository
    {
        private readonly ConViverDbContext _context;

        public OcorrenciaRepository(ConViverDbContext context)
        {
            _context = context;
        }

        public async Task<Ocorrencia> GetByIdAsync(Guid id)
        {
            return await _context.Ocorrencias.FindAsync(id);
        }

        public async Task<Ocorrencia> GetByIdWithDetailsAsync(Guid id)
        {
            return await _context.Ocorrencias
                .Include(o => o.Usuario)
                .Include(o => o.Unidade)
                .Include(o => o.Condominio)
                .Include(o => o.Anexos)
                .Include(o => o.Comentarios)
                    .ThenInclude(c => c.Usuario) // User who made the comment
                .Include(o => o.HistoricoStatus)
                    .ThenInclude(hs => hs.AlteradoPor) // User who changed the status
                .FirstOrDefaultAsync(o => o.Id == id);
        }

        public async Task<IEnumerable<Ocorrencia>> GetAllAsync()
        {
            return await _context.Ocorrencias.ToListAsync();
        }

        public async Task<PagedResultDto<Ocorrencia>> GetOcorrenciasFilteredAndPaginatedAsync(
            OcorrenciaQueryParametersDto queryParams, Guid? userId, bool isAdminOrSindico)
        {
            var query = _context.Ocorrencias.AsQueryable();

            // Apply filters
            if (queryParams.Status.HasValue)
            {
                query = query.Where(o => o.Status == queryParams.Status.Value);
            }

            if (queryParams.Categoria.HasValue)
            {
                query = query.Where(o => o.Categoria == queryParams.Categoria.Value);
            }

            if (queryParams.PeriodoInicio.HasValue)
            {
                query = query.Where(o => o.DataAbertura >= queryParams.PeriodoInicio.Value);
            }

            if (queryParams.PeriodoFim.HasValue)
            {
                query = query.Where(o => o.DataAbertura <= queryParams.PeriodoFim.Value);
            }

            if (queryParams.Minha.HasValue && queryParams.Minha.Value && userId.HasValue)
            {
                query = query.Where(o => o.UsuarioId == userId.Value);
            }
            else if (!isAdminOrSindico && userId.HasValue) // Non-admin/sindico users might have restricted visibility
            {
                // Example: only see their own or from their condominio.
                // This logic might need to be more complex based on exact business rules.
                // For now, let's assume they can see all if not "Minha" specific, or this needs adjustment.
                // query = query.Where(o => o.UsuarioId == userId.Value || o.CondominioId == SOME_USER_CONDOMINIO_ID);
                // This part is complex and depends on how CondominioId is linked to the user.
                // For this implementation, if not Admin/Sindico and not "Minha", they see all.
                // This should be reviewed for actual security/visibility rules.
            }

            query = query
                .Include(o => o.Usuario) // Include Usuario for NomeUsuario in ListItemDto
                .OrderByDescending(o => o.DataAtualizacao); // Default sort order

            var totalCount = await query.CountAsync();

            var items = await query
                .Skip((queryParams.Pagina - 1) * queryParams.TamanhoPagina)
                .Take(queryParams.TamanhoPagina)
                .ToListAsync();

            return new PagedResultDto<Ocorrencia>
            {
                Items = items,
                TotalCount = totalCount,
                PageNumber = queryParams.Pagina,
                PageSize = queryParams.TamanhoPagina
            };
        }


        public async Task AddAsync(Ocorrencia ocorrencia)
        {
            await _context.Ocorrencias.AddAsync(ocorrencia);
            // SaveChangesAsync will be called by a UnitOfWork or the service layer
        }

        public async Task UpdateAsync(Ocorrencia ocorrencia)
        {
            _context.Entry(ocorrencia).State = EntityState.Modified;
            // SaveChangesAsync will be called by a UnitOfWork or the service layer
        }

        public async Task DeleteAsync(Ocorrencia ocorrencia)
        {
            _context.Ocorrencias.Remove(ocorrencia);
            // SaveChangesAsync will be called by a UnitOfWork or the service layer
        }

        public async Task<IEnumerable<OcorrenciaStatusHistorico>> GetStatusHistoricoByOcorrenciaIdAsync(Guid ocorrenciaId)
        {
            return await _context.OcorrenciaStatusHistoricos
                .Where(h => h.OcorrenciaId == ocorrenciaId)
                .Include(h => h.AlteradoPor)
                .OrderByDescending(h => h.Data)
                .ToListAsync();
        }

        public async Task<IEnumerable<OcorrenciaComentario>> GetComentariosByOcorrenciaIdAsync(Guid ocorrenciaId)
        {
            return await _context.OcorrenciaComentarios
                .Where(c => c.OcorrenciaId == ocorrenciaId)
                .Include(c => c.Usuario)
                .OrderByDescending(c => c.Data)
                .ToListAsync();
        }

        public async Task<IEnumerable<OcorrenciaAnexo>> GetAnexosByOcorrenciaIdAsync(Guid ocorrenciaId)
        {
            return await _context.OcorrenciaAnexos
                .Where(a => a.OcorrenciaId == ocorrenciaId)
                .ToListAsync();
        }

        public async Task AddComentarioAsync(OcorrenciaComentario comentario)
        {
            await _context.OcorrenciaComentarios.AddAsync(comentario);
        }

        public async Task AddStatusHistoricoAsync(OcorrenciaStatusHistorico statusHistorico)
        {
            await _context.OcorrenciaStatusHistoricos.AddAsync(statusHistorico);
        }

        public async Task AddAnexoAsync(OcorrenciaAnexo anexo)
        {
            await _context.OcorrenciaAnexos.AddAsync(anexo);
        }

        public async Task AddAnexosAsync(IEnumerable<OcorrenciaAnexo> anexos)
        {
            await _context.OcorrenciaAnexos.AddRangeAsync(anexos);
        }
    }
}
