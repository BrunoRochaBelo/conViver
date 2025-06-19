using System;
using System.Linq;
using conViver.Core.Entities;
using conViver.Core.Enums;

namespace conViver.Infrastructure.Data.Contexts;

public static class DataSeeder
{
    public static void Seed(ConViverDbContext db)
    {
        if (!db.Usuarios.Any())
        {
            var condoId = Guid.NewGuid();
            var unidadeId = Guid.NewGuid();

            db.Condominios.Add(new Condominio
            {
                Id = condoId,
                Nome = "Condomínio Demo"
            });

            db.Unidades.Add(new Unidade
            {
                Id = unidadeId,
                CondominioId = condoId,
                Identificacao = "101",
                FracaoIdeal = 1,
                Tipo = "residencial"
            });

            var user = new Usuario
            {
                Id = Guid.NewGuid(),
                Nome = "Usuário Teste",
                Email = "admin@conviver.local",
                SenhaHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
                Perfil = PerfilUsuario.Administrador,
                CondominioId = condoId,
                UnidadeId = unidadeId
            };
            db.Usuarios.Add(user);
            db.SaveChanges();
        }
    }
}
