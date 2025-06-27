using System;
using System.Linq;
using conViver.Core.Entities;
using conViver.Core.Enums;

namespace conViver.Infrastructure.Data.Contexts;

public static class DataSeeder
{
    public static void Seed(ConViverDbContext db)
    {
        // Ensure there is at least one Condomínio and Unidade to associate users
        var condominio = db.Condominios.FirstOrDefault();
        if (condominio == null)
        {
            condominio = new Condominio
            {
                Id = Guid.NewGuid(),
                Nome = "Condomínio Teste",
                Endereco = new conViver.Core.ValueObjects.Endereco
                {
                    Logradouro = "Rua de Teste",
                    Numero = "123",
                    Bairro = "Centro",
                    Cidade = "Testlândia",
                    Uf = "TS",
                    Cep = "00000-000"
                }
            };
            db.Condominios.Add(condominio);
            db.SaveChanges();
        }

        var unidade = db.Unidades.FirstOrDefault(u => u.CondominioId == condominio.Id);
        if (unidade == null)
        {
            unidade = new Unidade
            {
                Id = Guid.NewGuid(),
                CondominioId = condominio.Id,
                Identificacao = "Apto 101",
                FracaoIdeal = 1,
                Tipo = "Residencial"
            };
            db.Unidades.Add(unidade);
            db.SaveChanges();
        }

        // Check each default user by email and create if missing
        if (!db.Usuarios.Any(u => u.Email == "admin@conviver.local"))
        {
            var adminUser = new Usuario
            {
                Id = Guid.NewGuid(),
                Nome = "Usuário Administrador",
                Email = "admin@conviver.local",
                SenhaHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
                Perfil = PerfilUsuario.Administrador,
                UnidadeId = unidade.Id,
                CondominioId = condominio.Id
            };
            db.Usuarios.Add(adminUser);
        }

        if (!db.Usuarios.Any(u => u.Email == "sindico@conviver.local"))
        {
            var sindicoUser = new Usuario
            {
                Id = Guid.NewGuid(),
                Nome = "Usuário Síndico",
                Email = "sindico@conviver.local",
                SenhaHash = BCrypt.Net.BCrypt.HashPassword("sindico123"),
                Perfil = PerfilUsuario.Sindico,
                UnidadeId = unidade.Id,
                CondominioId = condominio.Id
            };
            db.Usuarios.Add(sindicoUser);
        }

        if (!db.Usuarios.Any(u => u.Email == "teste@conviver.local"))
        {
            var testUser = new Usuario
            {
                Id = Guid.NewGuid(),
                Nome = "Usuário de Teste",
                Email = "teste@conviver.local",
                SenhaHash = BCrypt.Net.BCrypt.HashPassword("123456"),
                Perfil = PerfilUsuario.Morador,
                UnidadeId = unidade.Id,
                CondominioId = condominio.Id
            };
            db.Usuarios.Add(testUser);
        }

        if (!db.Usuarios.Any(u => u.Email == "porteiro@conviver.local"))
        {
            var porteiroUser = new Usuario
            {
                Id = Guid.NewGuid(),
                Nome = "Usuário Porteiro",
                Email = "porteiro@conviver.local",
                SenhaHash = BCrypt.Net.BCrypt.HashPassword("porteiro123"),
                Perfil = PerfilUsuario.Porteiro,
                UnidadeId = unidade.Id,
                CondominioId = condominio.Id
            };
            db.Usuarios.Add(porteiroUser);
        }

        if (db.ChangeTracker.HasChanges())
        {
            db.SaveChanges();
        }
    }
}
