using System;
using System.Linq;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Json;
using System.Net.Http.Headers;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Data.Sqlite;
using Xunit;
using FluentAssertions;
using conViver.Core.Enums;
using conViver.Core.DTOs;
using conViver.Infrastructure.Data.Contexts;

namespace conViver.Tests.Infrastructure;

public class DataSeederIntegrationTests
{
    private const string TestSecret = "super-secret-test-key-1234567890123456";

    private static string GenerateToken(Guid userId, string role, Guid condominioId)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new("role", role),
            new("condominioId", condominioId.ToString())
        };
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(TestSecret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(claims: claims, expires: DateTime.UtcNow.AddHours(1), signingCredentials: creds);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    [Fact]
    public void Seed_CreatesDefaultUsers()
    {
        var options = new DbContextOptionsBuilder<ConViverDbContext>()
            .UseInMemoryDatabase("SeedTestDb")
            .Options;
        using var db = new ConViverDbContext(options);
        db.Database.EnsureCreated();
        DataSeeder.Seed(db);

        var users = db.Usuarios.ToList();
        users.Should().HaveCount(4);
        users.Should().Contain(u => u.Email == "admin@conviver.local" && u.Perfil == PerfilUsuario.Administrador);
        users.Should().Contain(u => u.Email == "sindico@conviver.local" && u.Perfil == PerfilUsuario.Sindico);
        users.Should().Contain(u => u.Email == "teste@conviver.local" && u.Perfil == PerfilUsuario.Morador);
        users.Should().Contain(u => u.Email == "porteiro@conviver.local" && u.Perfil == PerfilUsuario.Porteiro);
    }

    private class ApiFactory : WebApplicationFactory<Program>
    {
        private SqliteConnection? _connection;
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.ConfigureServices(services =>
            {
                var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<ConViverDbContext>));
                if (descriptor != null) services.Remove(descriptor);
                _connection = new SqliteConnection("DataSource=:memory:");
                _connection.Open();
                services.AddDbContext<ConViverDbContext>(options => options.UseSqlite(_connection));
            });
            builder.UseEnvironment("Development");
        }

        protected override IHost CreateHost(IHostBuilder builder)
        {
            var host = base.CreateHost(builder);
            using var scope = host.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ConViverDbContext>();
            db.Database.EnsureCreated();
            DataSeeder.Seed(db);
            return host;
        }
    }

    [Fact]
    public async Task SindicoEndpoint_ShouldReject_MoradorToken()
    {
        Environment.SetEnvironmentVariable("JWT_SECRET", TestSecret);
        using var factory = new ApiFactory();
        var client = factory.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("http://localhost/api/v1/") });
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ConViverDbContext>();
        var morador = db.Usuarios.Single(u => u.Email == "teste@conviver.local");
        var condominioId = morador.CondominioId;
        var token = GenerateToken(morador.Id, morador.Perfil.ToString(), condominioId);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var dto = new VotacaoInputDto
        {
            Titulo = "Votação Teste",
            Opcoes = new List<OpcaoInputDto>
            {
                new() { Descricao = "Op1" },
                new() { Descricao = "Op2" }
            }
        };
        var response = await client.PostAsJsonAsync("votacoes/syndic/votacoes", dto);
        response.StatusCode.Should().Be(System.Net.HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task PorteiroEndpoint_ShouldAccept_PorteiroToken()
    {
        Environment.SetEnvironmentVariable("JWT_SECRET", TestSecret);
        using var factory = new ApiFactory();
        var client = factory.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("http://localhost/api/v1/") });
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ConViverDbContext>();
        var porteiro = db.Usuarios.Single(u => u.Email == "porteiro@conviver.local");
        var condominioId = porteiro.CondominioId;
        var token = GenerateToken(porteiro.Id, porteiro.Perfil.ToString(), condominioId);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var unidadeId = db.Unidades.First().Id;
        var visitanteDto = new VisitanteInputDto { UnidadeId = unidadeId, Nome = "Visitante" };
        var response = await client.PostAsJsonAsync("visitantes/registrar-entrada", visitanteDto);
        response.StatusCode.Should().Be(System.Net.HttpStatusCode.Created);
    }
}
