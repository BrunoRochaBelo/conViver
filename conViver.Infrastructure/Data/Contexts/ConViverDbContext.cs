using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using conViver.Core.Entities;
using conViver.Core.Enums;

namespace conViver.Infrastructure.Data.Contexts
{
    public class ConViverDbContext : DbContext
    {
        public ConViverDbContext(DbContextOptions<ConViverDbContext> options) : base(options) { }

        public DbSet<Condominio> Condominios => Set<Condominio>();
        public DbSet<Unidade> Unidades => Set<Unidade>();
        public DbSet<Usuario> Usuarios => Set<Usuario>();
        public DbSet<Boleto> Boletos => Set<Boleto>();
        public DbSet<Acordo> Acordos => Set<Acordo>();
        public DbSet<ParcelaAcordo> ParcelasAcordo => Set<ParcelaAcordo>();
        public DbSet<Pagamento> Pagamentos => Set<Pagamento>();
        public DbSet<Reserva> Reservas => Set<Reserva>();
        public DbSet<Aviso> Avisos => Set<Aviso>();
        public DbSet<Visitante> Visitantes => Set<Visitante>();
        public DbSet<Encomenda> Encomendas => Set<Encomenda>();
        public DbSet<OrdemServico> OrdensServico => Set<OrdemServico>();
        public DbSet<PrestadorServico> Prestadores => Set<PrestadorServico>();
        public DbSet<LancamentoFinanceiro> Lancamentos => Set<LancamentoFinanceiro>();
        public DbSet<Documento> Documentos => Set<Documento>();
        public DbSet<OrcamentoAnual> OrcamentosAnuais => Set<OrcamentoAnual>();
        public DbSet<Votacao> Votacoes => Set<Votacao>();
        public DbSet<OpcaoVotacao> OpcoesVotacao => Set<OpcaoVotacao>();
        public DbSet<VotoRegistrado> VotosRegistrados => Set<VotoRegistrado>();
        public DbSet<Chamado> Chamados => Set<Chamado>();
        public DbSet<AvaliacaoPrestador> AvaliacoesPrestadores { get; set; } = null!;

        // Ocorrências
        public DbSet<Ocorrencia> Ocorrencias { get; set; }
        public DbSet<OcorrenciaAnexo> OcorrenciaAnexos { get; set; }
        public DbSet<OcorrenciaComentario> OcorrenciaComentarios { get; set; }
        public DbSet<OcorrenciaStatusHistorico> OcorrenciaStatusHistoricos { get; set; }

        // Banco
        public DbSet<ContaBancaria> ContasBancarias => Set<ContaBancaria>();
        public DbSet<ExtratoBancario> ExtratosBancarios => Set<ExtratoBancario>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // ----------------------------
            // Índices e Owned Types
            // ----------------------------
            modelBuilder.Entity<Condominio>()
                .OwnsOne(c => c.Endereco);

            modelBuilder.Entity<Boleto>()
                .HasIndex(b => new { b.NossoNumero, b.CodigoBanco })
                .IsUnique();

            // ----------------------------
            // Relações Usuário ↔ Unidade
            // ----------------------------
            modelBuilder.Entity<Usuario>()
                .HasOne(u => u.Unidade)
                .WithMany(un => un.Usuarios)
                .HasForeignKey(u => u.UnidadeId)
                .IsRequired();

            // ----------------------------
            // Votação e Opções
            // ----------------------------
            modelBuilder.Entity<Votacao>()
                .HasMany(v => v.Opcoes)
                .WithOne(o => o.Votacao)
                .HasForeignKey(o => o.VotacaoId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<OpcaoVotacao>()
                .HasMany(o => o.VotosRecebidos)
                .WithOne(vr => vr.OpcaoVotacao)
                .HasForeignKey(vr => vr.OpcaoVotacaoId)
                .OnDelete(DeleteBehavior.Cascade);

            // ----------------------------
            // Chamado.Fotos → JSON
            // ----------------------------
            modelBuilder.Entity<Chamado>()
                .Property(c => c.Fotos)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, null),
                    v => JsonSerializer.Deserialize<List<string>>(v, null) ?? new List<string>());

            // ----------------------------
            // Prestador ↔ Avaliações
            // ----------------------------
            modelBuilder.Entity<PrestadorServico>()
                .HasMany(p => p.Avaliacoes)
                .WithOne(a => a.PrestadorServico)
                .HasForeignKey(a => a.PrestadorServicoId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<AvaliacaoPrestador>()
                .HasIndex(a => new { a.PrestadorServicoId, a.UsuarioId, a.OrdemServicoId })
                .IsUnique(false);

            // ----------------------------
            // Ocorrências
            // ----------------------------
            modelBuilder.Entity<Ocorrencia>(entity =>
            {
                entity.HasKey(o => o.Id);
                entity.Property(o => o.Titulo).IsRequired();
                entity.Property(o => o.Descricao).IsRequired();
                entity.Property(o => o.Categoria).HasConversion<string>().IsRequired();
                entity.Property(o => o.Status).HasConversion<string>().IsRequired();
                entity.Property(o => o.Prioridade).HasConversion<string>().IsRequired();
                entity.Property(o => o.DataAbertura).IsRequired();
                entity.Property(o => o.DataAtualizacao).IsRequired();
                entity.Property(o => o.UsuarioId).IsRequired();
                entity.Property(o => o.CondominioId).IsRequired();

                entity.HasOne(o => o.Usuario)
                    .WithMany()
                    .HasForeignKey(o => o.UsuarioId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(o => o.Unidade)
                    .WithMany()
                    .HasForeignKey(o => o.UnidadeId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(o => o.Condominio)
                    .WithMany()
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

            modelBuilder.Entity<OcorrenciaAnexo>(entity =>
            {
                entity.HasKey(oa => oa.Id);
                entity.Property(oa => oa.Url).IsRequired();
                entity.Property(oa => oa.NomeArquivo).IsRequired();
                entity.Property(oa => oa.Tipo).IsRequired();
                entity.Property(oa => oa.Tamanho).IsRequired();
            });

            modelBuilder.Entity<OcorrenciaComentario>(entity =>
            {
                entity.HasKey(oc => oc.Id);
                entity.Property(oc => oc.Texto).IsRequired();
                entity.Property(oc => oc.Data).IsRequired();

                entity.HasOne(oc => oc.Usuario)
                    .WithMany()
                    .HasForeignKey(oc => oc.UsuarioId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<OcorrenciaStatusHistorico>(entity =>
            {
                entity.HasKey(osh => osh.Id);
                entity.Property(osh => osh.Status).HasConversion<string>().IsRequired();
                entity.Property(osh => osh.AlteradoPorId).IsRequired();
                entity.Property(osh => osh.Data).IsRequired();

                entity.HasOne(osh => osh.AlteradoPor)
                    .WithMany()
                    .HasForeignKey(osh => osh.AlteradoPorId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // ----------------------------
            // Contas e Extratos Bancários
            // ----------------------------
            modelBuilder.Entity<ContaBancaria>(entity =>
            {
                entity.HasKey(c => c.Id);
                entity.Property(c => c.Banco).IsRequired();
                entity.Property(c => c.Agencia).IsRequired();
                entity.Property(c => c.Conta).IsRequired();
            });

            modelBuilder.Entity<ExtratoBancario>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Tipo).IsRequired();
                entity.Property(e => e.Valor).IsRequired();
                entity.Property(e => e.Data).IsRequired();

                entity.HasOne(e => e.ContaBancaria)
                    .WithMany(c => c.Lancamentos)
                    .HasForeignKey(e => e.ContaBancariaId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // ----------------------------
            // Acordo e Parcelas
            // ----------------------------
            modelBuilder.Entity<ParcelaAcordo>(entity =>
            {
                entity.HasKey(p => p.Id);
                entity.Property(p => p.Numero).IsRequired();
                entity.Property(p => p.Valor).IsRequired();
                entity.Property(p => p.Vencimento).IsRequired();

                entity.HasOne<Acordo>()
                    .WithMany()
                    .HasForeignKey(p => p.AcordoId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne<Boleto>()
                    .WithMany()
                    .HasForeignKey(p => p.BoletoId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // ----------------------------
            // Pagamentos
            // ----------------------------
            modelBuilder.Entity<Pagamento>(entity =>
            {
                entity.HasKey(p => p.Id);
                entity.Property(p => p.Origem).IsRequired();
                entity.Property(p => p.ValorPago).IsRequired();
                entity.Property(p => p.DataPgto).IsRequired();

                entity.HasOne<Boleto>()
                    .WithMany()
                    .HasForeignKey(p => p.BoletoId)
                    .OnDelete(DeleteBehavior.Restrict);
            });
        }
    }
}
