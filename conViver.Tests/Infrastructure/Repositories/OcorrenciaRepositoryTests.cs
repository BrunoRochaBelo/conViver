using System;
using System.Linq;
using System.Threading.Tasks;
using conViver.Core.DTOs;
using conViver.Core.Entities;
using conViver.Core.Enums;
using conViver.Infrastructure.Data.Contexts;
using conViver.Infrastructure.Data.Repositories;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace conViver.Tests.Infrastructure.Repositories
{
    public class OcorrenciaRepositoryTests
    {
        private static ConViverDbContext CreateContext(string dbName)
        {
            var options = new DbContextOptionsBuilder<ConViverDbContext>()
                .UseInMemoryDatabase(dbName)
                .Options;
            return new ConViverDbContext(options);
        }

        [Fact]
        public async Task Morador_Should_Not_See_Ocorrencias_From_Other_Users()
        {
            var dbName = Guid.NewGuid().ToString();
            using var context = CreateContext(dbName);

            var condId = Guid.NewGuid();
            var user1 = new Usuario { Id = Guid.NewGuid(), Nome = "U1", CondominioId = condId, UnidadeId = Guid.NewGuid() };
            var user2 = new Usuario { Id = Guid.NewGuid(), Nome = "U2", CondominioId = condId, UnidadeId = Guid.NewGuid() };

            var oc1 = new Ocorrencia
            {
                Id = Guid.NewGuid(),
                Titulo = "O1",
                Descricao = "D1",
                Categoria = OcorrenciaCategoria.OUTROS,
                Status = OcorrenciaStatus.ABERTA,
                Prioridade = OcorrenciaPrioridade.NORMAL,
                DataAbertura = DateTime.UtcNow,
                DataAtualizacao = DateTime.UtcNow,
                UsuarioId = user1.Id,
                CondominioId = condId
            };

            var oc2 = new Ocorrencia
            {
                Id = Guid.NewGuid(),
                Titulo = "O2",
                Descricao = "D2",
                Categoria = OcorrenciaCategoria.OUTROS,
                Status = OcorrenciaStatus.ABERTA,
                Prioridade = OcorrenciaPrioridade.NORMAL,
                DataAbertura = DateTime.UtcNow,
                DataAtualizacao = DateTime.UtcNow,
                UsuarioId = user2.Id,
                CondominioId = condId
            };

            context.Usuarios.AddRange(user1, user2);
            context.Ocorrencias.AddRange(oc1, oc2);
            await context.SaveChangesAsync();

            var repo = new OcorrenciaRepository(context);
            var result = await repo.GetOcorrenciasFilteredAndPaginatedAsync(new OcorrenciaQueryParametersDto { Pagina = 1, TamanhoPagina = 10 }, user1.Id, false);

            Assert.Single(result.Items);
            Assert.Equal(oc1.Id, result.Items.First().Id);
        }
    }
}
