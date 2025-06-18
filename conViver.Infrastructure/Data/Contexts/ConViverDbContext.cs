using Microsoft.EntityFrameworkCore;
using conViver.Core.Entities;

namespace conViver.Infrastructure.Data.Contexts;

public class ConViverDbContext : DbContext
{
    public ConViverDbContext(DbContextOptions<ConViverDbContext> options) : base(options)
    {
    }

    public DbSet<Condominio> Condominios => Set<Condominio>();
    public DbSet<Unidade> Unidades => Set<Unidade>();
    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<Boleto> Boletos => Set<Boleto>();
    public DbSet<Reserva> Reservas => Set<Reserva>();
    public DbSet<Aviso> Avisos => Set<Aviso>();
    public DbSet<Visitante> Visitantes => Set<Visitante>();
    public DbSet<Encomenda> Encomendas => Set<Encomenda>();
    public DbSet<OrdemServico> OrdensServico => Set<OrdemServico>();
    public DbSet<PrestadorServico> Prestadores => Set<PrestadorServico>();
    public DbSet<LancamentoFinanceiro> Lancamentos => Set<LancamentoFinanceiro>();
    public DbSet<Documento> Documentos => Set<Documento>();
    public DbSet<Votacao> Votacoes => Set<Votacao>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Condominio>().OwnsOne(c => c.Endereco);
        modelBuilder.Entity<Boleto>().HasIndex(b => new { b.NossoNumero, b.CodigoBanco }).IsUnique();
    }
}
