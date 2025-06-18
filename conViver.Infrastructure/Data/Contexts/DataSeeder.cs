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
            var user = new Usuario
            {
                Id = Guid.NewGuid(),
                Nome = "Usuário Teste",
                Email = "admin@conviver.local",
                SenhaHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
                Perfil = PerfilUsuario.Administrador
            };
            db.Usuarios.Add(user);
            db.SaveChanges();
        }
    }
}
