using Microsoft.EntityFrameworkCore;
using conViver.Core.Entities;
using conViver.Core.Enums; // Added for Ocorrencia Enums

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
    public DbSet<OpcaoVotacao> OpcoesVotacao => Set<OpcaoVotacao>();
    public DbSet<VotoRegistrado> VotosRegistrados => Set<VotoRegistrado>();
    public DbSet<Chamado> Chamados => Set<Chamado>();
    public DbSet<Ocorrencia> Ocorrencias => Set<Ocorrencia>(); // Added Ocorrencia DbSet
    public DbSet<AvaliacaoPrestador> AvaliacoesPrestadores { get; set; } = null!; // Adicionado DbSet para AvaliacaoPrestador

    // Ocorrências
    public DbSet<Ocorrencia> Ocorrencias { get; set; }
    public DbSet<OcorrenciaAnexo> OcorrenciaAnexos { get; set; }
    public DbSet<OcorrenciaComentario> OcorrenciaComentarios { get; set; }
    public DbSet<OcorrenciaStatusHistorico> OcorrenciaStatusHistoricos { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Condominio>().OwnsOne(c => c.Endereco);
        modelBuilder.Entity<Boleto>().HasIndex(b => new { b.NossoNumero, b.CodigoBanco }).IsUnique();

        // Relacionamento Usuario <-> Unidade (Um-para-Muitos: Uma Unidade tem Muitos Usuarios)
        modelBuilder.Entity<Usuario>()
            .HasOne(u => u.Unidade) // Usuario tem uma Unidade (principal)
            .WithMany(un => un.Usuarios) // Unidade tem muitos Usuarios
            .HasForeignKey(u => u.UnidadeId) // Chave estrangeira em Usuario
            .IsRequired(); // Define que UnidadeId é obrigatória em Usuario.

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

        // Ocorrencia Configuration
        modelBuilder.Entity<Ocorrencia>(entity =>
        {
            entity.HasKey(o => o.Id);
            entity.Property(o => o.Titulo).IsRequired();
            entity.Property(o => o.Descricao).IsRequired();
            entity.Property(o => o.Categoria).IsRequired().HasConversion<string>();
            entity.Property(o => o.Status).IsRequired().HasConversion<string>();
            entity.Property(o => o.Prioridade).IsRequired().HasConversion<string>();
            entity.Property(o => o.DataAbertura).IsRequired();
            entity.Property(o => o.DataAtualizacao).IsRequired();
            entity.Property(o => o.UsuarioId).IsRequired();
            entity.Property(o => o.CondominioId).IsRequired();
            // UnidadeId is nullable, so no IsRequired()

            entity.HasOne(o => o.Usuario)
                .WithMany() // Assuming Usuario does not have a direct ICollection<Ocorrencia> yet. If it does, specify it here.
                .HasForeignKey(o => o.UsuarioId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(o => o.Unidade)
                .WithMany() // Assuming Unidade does not have a direct ICollection<Ocorrencia> yet.
                .HasForeignKey(o => o.UnidadeId)
                .OnDelete(DeleteBehavior.Restrict); // Or SetNull if appropriate for nullable FK

            entity.HasOne(o => o.Condominio)
                .WithMany() // Assuming Condominio does not have a direct ICollection<Ocorrencia> yet.
                .HasForeignKey(o => o.CondominioId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(o => o.Anexos)
                .WithOne(a => a.Ocorrencia)
                .HasForeignKey(a => a.OcorrenciaId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(o => o.Comentarios)
                .WithOne(c => c.Ocorrencia)
                .HasForeignKey(c => c.OcorrenciaId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(o => o.HistoricoStatus)
                .WithOne(h => h.Ocorrencia)
                .HasForeignKey(h => h.OcorrenciaId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // OcorrenciaAnexo Configuration
        modelBuilder.Entity<OcorrenciaAnexo>(entity =>
        {
            entity.HasKey(oa => oa.Id);
            entity.Property(oa => oa.OcorrenciaId).IsRequired();
            entity.Property(oa => oa.Url).IsRequired();
            entity.Property(oa => oa.NomeArquivo).IsRequired();
            entity.Property(oa => oa.Tipo).IsRequired();
            entity.Property(oa => oa.Tamanho).IsRequired();

            // Relationship already defined in Ocorrencia entity configuration
        });

        // OcorrenciaComentario Configuration
        modelBuilder.Entity<OcorrenciaComentario>(entity =>
        {
            entity.HasKey(oc => oc.Id);
            entity.Property(oc => oc.OcorrenciaId).IsRequired();
            entity.Property(oc => oc.UsuarioId).IsRequired();
            entity.Property(oc => oc.Texto).IsRequired();
            entity.Property(oc => oc.Data).IsRequired();

            entity.HasOne(oc => oc.Usuario)
                .WithMany() // Assuming Usuario does not have ICollection<OcorrenciaComentario>
                .HasForeignKey(oc => oc.UsuarioId)
                .OnDelete(DeleteBehavior.Restrict); // Prevent comment deletion from causing user deletion issues

            // Relationship with Ocorrencia already defined in Ocorrencia entity configuration
        });

        // OcorrenciaStatusHistorico Configuration
        modelBuilder.Entity<OcorrenciaStatusHistorico>(entity =>
        {
            entity.HasKey(osh => osh.Id);
            entity.Property(osh => osh.OcorrenciaId).IsRequired();
            entity.Property(osh => osh.Status).IsRequired().HasConversion<string>();
            entity.Property(osh => osh.AlteradoPorId).IsRequired();
            entity.Property(osh => osh.Data).IsRequired();

            entity.HasOne(osh => osh.AlteradoPor) // Navigation property to Usuario
                .WithMany() // Assuming Usuario does not have ICollection<OcorrenciaStatusHistorico>
                .HasForeignKey(osh => osh.AlteradoPorId)
                .OnDelete(DeleteBehavior.Restrict);

            // Relationship with Ocorrencia already defined in Ocorrencia entity configuration
        });
    }
}
