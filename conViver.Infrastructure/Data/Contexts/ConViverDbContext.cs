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
    public DbSet<EspacoComum> EspacosComuns { get; set; }
    public DbSet<Aviso> Avisos => Set<Aviso>();
    public DbSet<Visitante> Visitantes => Set<Visitante>();
    public DbSet<Encomenda> Encomendas => Set<Encomenda>();
    public DbSet<OrdemServico> OrdensServico => Set<OrdemServico>();
    public DbSet<PrestadorServico> Prestadores => Set<PrestadorServico>();
    public DbSet<LancamentoFinanceiro> Lancamentos => Set<LancamentoFinanceiro>();
    public DbSet<Documento> Documentos => Set<Documento>();
    public DbSet<Votacao> Votacoes => Set<Votacao>();
    public DbSet<OpcaoVotacao> OpcoesVotacao => Set<OpcaoVotacao>();
    public DbSet<VotoRegistrado> VotosRegistrados => Set<VotoRegistrado>();
    public DbSet<Chamado> Chamados => Set<Chamado>();
    public DbSet<AvaliacaoPrestador> AvaliacoesPrestadores { get; set; } = null!; // Adicionado DbSet para AvaliacaoPrestador
    public DbSet<AvisoLeitura> AvisosLidos => Set<AvisoLeitura>();
    public DbSet<LogAuditoria> LogsAuditoria => Set<LogAuditoria>();
    public DbSet<CirculacaoSolicitacao> Circulacoes => Set<CirculacaoSolicitacao>();
    public DbSet<OcorrenciaSeguranca> Ocorrencias => Set<OcorrenciaSeguranca>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Condominio>().OwnsOne(c => c.Endereco);
        modelBuilder.Entity<Boleto>().HasIndex(b => new { b.NossoNumero, b.CodigoBanco }).IsUnique();

        // Relacionamento Votacao <-> OpcaoVotacao (Um-para-Muitos)
        modelBuilder.Entity<Votacao>()
            .HasMany(v => v.Opcoes)
            .WithOne(o => o.Votacao)
            .HasForeignKey(o => o.VotacaoId)
            .OnDelete(DeleteBehavior.Cascade); // Ou Restrict, dependendo da regra de negócio

        // Relacionamento OpcaoVotacao <-> VotoRegistrado (Um-para-Muitos)
        modelBuilder.Entity<OpcaoVotacao>()
            .HasMany(o => o.VotosRecebidos)
            .WithOne(vr => vr.OpcaoVotacao)
            .HasForeignKey(vr => vr.OpcaoVotacaoId)
            .OnDelete(DeleteBehavior.Cascade); // Ou Restrict

        // Configuração para Chamado.Fotos (List<string>)
        // Se estiver usando EF Core 5+ e um provedor como Npgsql (PostgreSQL), List<string> pode ser mapeado para jsonb nativamente.
        // Para SQL Server, ou versões mais antigas, um ValueConverter seria necessário para serializar para uma string JSON.
        // Exemplo de ValueConverter (não adicionando agora, apenas para ilustração):
        // modelBuilder.Entity<Chamado>()
        //     .Property(c => c.Fotos)
        //     .HasConversion(
        //         v => System.Text.Json.JsonSerializer.Serialize(v, (System.Text.Json.JsonSerializerOptions?)null),
        //         v => System.Text.Json.JsonSerializer.Deserialize<List<string>>(v, (System.Text.Json.JsonSerializerOptions?)null) ?? new List<string>(),
        //         new Microsoft.EntityFrameworkCore.ChangeTracking.ValueComparer<List<string>>(
        //             (c1, c2) => c1!.SequenceEqual(c2!),
        //             c => c.Aggregate(0, (a, v) => HashCode.Combine(a, v.GetHashCode())),
        //             c => c.ToList()));
        // Por enquanto, deixaremos o EF Core tentar o mapeamento padrão.

        // Relacionamento PrestadorServico <-> AvaliacaoPrestador (Um-para-Muitos)
        modelBuilder.Entity<PrestadorServico>()
            .HasMany(p => p.Avaliacoes)
            .WithOne(a => a.PrestadorServico)
            .HasForeignKey(a => a.PrestadorServicoId)
            .OnDelete(DeleteBehavior.Cascade); // Ou Restrict, dependendo da regra (Cascade deleta avaliações se prestador for removido)

        // Índice para AvaliacaoPrestador
        // A unicidade de (PrestadorServicoId, UsuarioId, OrdemServicoId) pode ser complexa.
        // Um usuário pode avaliar o mesmo prestador múltiplas vezes se for para OS diferentes.
        // Um usuário pode avaliar o mesmo prestador uma vez de forma geral (OrdemServicoId = null).
        // IsUnique(false) significa que não há restrição de unicidade no banco para essa combinação, apenas cria o índice.
        // Se uma regra de negócio específica de unicidade for necessária, ela deve ser implementada na lógica de serviço.
        modelBuilder.Entity<AvaliacaoPrestador>()
            .HasIndex(a => new { a.PrestadorServicoId, a.UsuarioId, a.OrdemServicoId })
            .IsUnique(false);
    }
}
