using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace conViver.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AdicionarUnidadeFKParaUsuario : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Avisos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    CondominioId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Categoria = table.Column<string>(type: "TEXT", nullable: false),
                    Titulo = table.Column<string>(type: "TEXT", nullable: false),
                    Corpo = table.Column<string>(type: "TEXT", nullable: true),
                    PublicadoEm = table.Column<DateTime>(type: "TEXT", nullable: false),
                    PublicadoPor = table.Column<Guid>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Avisos", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Boletos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    UnidadeId = table.Column<Guid>(type: "TEXT", nullable: false),
                    NossoNumero = table.Column<string>(type: "TEXT", nullable: false),
                    LinhaDigitavel = table.Column<string>(type: "TEXT", nullable: false),
                    CodigoBanco = table.Column<string>(type: "TEXT", nullable: false),
                    Valor = table.Column<decimal>(type: "TEXT", nullable: false),
                    DataVencimento = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    DataRegistro = table.Column<DateTime>(type: "TEXT", nullable: true),
                    DataEnvio = table.Column<DateTime>(type: "TEXT", nullable: true),
                    DataPagamento = table.Column<DateTime>(type: "TEXT", nullable: true),
                    ValorPago = table.Column<decimal>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Boletos", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Chamados",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    CondominioId = table.Column<Guid>(type: "TEXT", nullable: false),
                    UnidadeId = table.Column<Guid>(type: "TEXT", nullable: true),
                    UsuarioId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Titulo = table.Column<string>(type: "TEXT", nullable: false),
                    Descricao = table.Column<string>(type: "TEXT", nullable: false),
                    Fotos = table.Column<string>(type: "TEXT", nullable: false),
                    Status = table.Column<string>(type: "TEXT", nullable: false),
                    DataAbertura = table.Column<DateTime>(type: "TEXT", nullable: false),
                    DataResolucao = table.Column<DateTime>(type: "TEXT", nullable: true),
                    RespostaDoSindico = table.Column<string>(type: "TEXT", nullable: true),
                    AvaliacaoNota = table.Column<int>(type: "INTEGER", nullable: true),
                    AvaliacaoComentario = table.Column<string>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Chamados", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Condominios",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Nome = table.Column<string>(type: "TEXT", nullable: false),
                    Cnpj = table.Column<string>(type: "TEXT", nullable: true),
                    Endereco_Logradouro = table.Column<string>(type: "TEXT", nullable: false),
                    Endereco_Numero = table.Column<string>(type: "TEXT", nullable: false),
                    Endereco_Bairro = table.Column<string>(type: "TEXT", nullable: false),
                    Endereco_Cidade = table.Column<string>(type: "TEXT", nullable: false),
                    Endereco_Uf = table.Column<string>(type: "TEXT", nullable: false),
                    Endereco_Cep = table.Column<string>(type: "TEXT", nullable: false),
                    Ativo = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Condominios", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Documentos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    CondominioId = table.Column<Guid>(type: "TEXT", nullable: false),
                    TituloDescritivo = table.Column<string>(type: "TEXT", nullable: false),
                    Url = table.Column<string>(type: "TEXT", nullable: false),
                    DataUpload = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Categoria = table.Column<string>(type: "TEXT", nullable: false),
                    NomeArquivoOriginal = table.Column<string>(type: "TEXT", nullable: false),
                    TipoArquivo = table.Column<string>(type: "TEXT", nullable: false),
                    TamanhoArquivoBytes = table.Column<long>(type: "INTEGER", nullable: false),
                    UsuarioUploadId = table.Column<Guid>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Documentos", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Encomendas",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    UnidadeId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Descricao = table.Column<string>(type: "TEXT", nullable: true),
                    FotoUrl = table.Column<string>(type: "TEXT", nullable: true),
                    RecebidoPor = table.Column<Guid>(type: "TEXT", nullable: true),
                    RecebidoEm = table.Column<DateTime>(type: "TEXT", nullable: false),
                    RetiradoEm = table.Column<DateTime>(type: "TEXT", nullable: true),
                    RetiradoPor = table.Column<Guid>(type: "TEXT", nullable: true),
                    CodigoRastreio = table.Column<string>(type: "TEXT", nullable: true),
                    Remetente = table.Column<string>(type: "TEXT", nullable: true),
                    Observacoes = table.Column<string>(type: "TEXT", nullable: true),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    DataStatus = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CodigoRetirada = table.Column<string>(type: "TEXT", nullable: true),
                    RetiradoPorTerceiroNome = table.Column<string>(type: "TEXT", nullable: true),
                    RetiradoPorTerceiroDocumento = table.Column<string>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Encomendas", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Lancamentos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    UnidadeId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Tipo = table.Column<string>(type: "TEXT", nullable: false),
                    Valor = table.Column<decimal>(type: "TEXT", nullable: false),
                    Data = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Descricao = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Lancamentos", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "OrdensServico",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    UnidadeId = table.Column<Guid>(type: "TEXT", nullable: false),
                    PrestadorId = table.Column<Guid>(type: "TEXT", nullable: true),
                    Descricao = table.Column<string>(type: "TEXT", nullable: true),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    CriadoEm = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ConcluidoEm = table.Column<DateTime>(type: "TEXT", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrdensServico", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Prestadores",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    CondominioId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Nome = table.Column<string>(type: "TEXT", nullable: false),
                    Telefone = table.Column<string>(type: "TEXT", nullable: true),
                    Email = table.Column<string>(type: "TEXT", nullable: true),
                    Documento = table.Column<string>(type: "TEXT", nullable: true),
                    Especialidade = table.Column<string>(type: "TEXT", nullable: true),
                    EnderecoCompleto = table.Column<string>(type: "TEXT", nullable: true),
                    RatingMedio = table.Column<double>(type: "REAL", nullable: true),
                    Ativo = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Prestadores", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Reservas",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    UnidadeId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Area = table.Column<string>(type: "TEXT", nullable: false),
                    Inicio = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Fim = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    Taxa = table.Column<decimal>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Reservas", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Unidades",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    CondominioId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Identificacao = table.Column<string>(type: "TEXT", nullable: false),
                    FracaoIdeal = table.Column<decimal>(type: "TEXT", nullable: false),
                    Tipo = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Unidades", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Visitantes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    UnidadeId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Nome = table.Column<string>(type: "TEXT", nullable: false),
                    Documento = table.Column<string>(type: "TEXT", nullable: true),
                    FotoUrl = table.Column<string>(type: "TEXT", nullable: true),
                    DataChegada = table.Column<DateTime>(type: "TEXT", nullable: false),
                    DataSaida = table.Column<DateTime>(type: "TEXT", nullable: true),
                    MotivoVisita = table.Column<string>(type: "TEXT", nullable: true),
                    HorarioSaidaPrevisto = table.Column<DateTime>(type: "TEXT", nullable: true),
                    Observacoes = table.Column<string>(type: "TEXT", nullable: true),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    QRCode = table.Column<string>(type: "TEXT", nullable: true),
                    PreAutorizadoPorCondominoId = table.Column<Guid>(type: "TEXT", nullable: true),
                    DataValidadePreAutorizacao = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Visitantes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Votacoes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    CondominioId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Titulo = table.Column<string>(type: "TEXT", nullable: false),
                    Descricao = table.Column<string>(type: "TEXT", nullable: false),
                    DataInicio = table.Column<DateTime>(type: "TEXT", nullable: false),
                    DataFim = table.Column<DateTime>(type: "TEXT", nullable: true),
                    Status = table.Column<string>(type: "TEXT", nullable: false),
                    CriadoPor = table.Column<Guid>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Votacoes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AvaliacoesPrestadores",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    PrestadorServicoId = table.Column<Guid>(type: "TEXT", nullable: false),
                    UsuarioId = table.Column<Guid>(type: "TEXT", nullable: false),
                    CondominioId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Nota = table.Column<int>(type: "INTEGER", nullable: false),
                    Comentario = table.Column<string>(type: "TEXT", nullable: true),
                    DataAvaliacao = table.Column<DateTime>(type: "TEXT", nullable: false),
                    OrdemServicoId = table.Column<Guid>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AvaliacoesPrestadores", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AvaliacoesPrestadores_Prestadores_PrestadorServicoId",
                        column: x => x.PrestadorServicoId,
                        principalTable: "Prestadores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Usuarios",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Nome = table.Column<string>(type: "TEXT", nullable: false),
                    Email = table.Column<string>(type: "TEXT", nullable: false),
                    SenhaHash = table.Column<string>(type: "TEXT", nullable: false),
                    Telefone = table.Column<string>(type: "TEXT", nullable: true),
                    Perfil = table.Column<int>(type: "INTEGER", nullable: false),
                    Ativo = table.Column<bool>(type: "INTEGER", nullable: false),
                    TwoFaSecret = table.Column<string>(type: "TEXT", nullable: true),
                    UnidadeId = table.Column<Guid>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Usuarios", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Usuarios_Unidades_UnidadeId",
                        column: x => x.UnidadeId,
                        principalTable: "Unidades",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "OpcoesVotacao",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    VotacaoId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Descricao = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OpcoesVotacao", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OpcoesVotacao_Votacoes_VotacaoId",
                        column: x => x.VotacaoId,
                        principalTable: "Votacoes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "VotosRegistrados",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    OpcaoVotacaoId = table.Column<Guid>(type: "TEXT", nullable: false),
                    UsuarioId = table.Column<Guid>(type: "TEXT", nullable: false),
                    DataVoto = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VotosRegistrados", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VotosRegistrados_OpcoesVotacao_OpcaoVotacaoId",
                        column: x => x.OpcaoVotacaoId,
                        principalTable: "OpcoesVotacao",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AvaliacoesPrestadores_PrestadorServicoId_UsuarioId_OrdemServicoId",
                table: "AvaliacoesPrestadores",
                columns: new[] { "PrestadorServicoId", "UsuarioId", "OrdemServicoId" });

            migrationBuilder.CreateIndex(
                name: "IX_Boletos_NossoNumero_CodigoBanco",
                table: "Boletos",
                columns: new[] { "NossoNumero", "CodigoBanco" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_OpcoesVotacao_VotacaoId",
                table: "OpcoesVotacao",
                column: "VotacaoId");

            migrationBuilder.CreateIndex(
                name: "IX_Usuarios_UnidadeId",
                table: "Usuarios",
                column: "UnidadeId");

            migrationBuilder.CreateIndex(
                name: "IX_VotosRegistrados_OpcaoVotacaoId",
                table: "VotosRegistrados",
                column: "OpcaoVotacaoId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AvaliacoesPrestadores");

            migrationBuilder.DropTable(
                name: "Avisos");

            migrationBuilder.DropTable(
                name: "Boletos");

            migrationBuilder.DropTable(
                name: "Chamados");

            migrationBuilder.DropTable(
                name: "Condominios");

            migrationBuilder.DropTable(
                name: "Documentos");

            migrationBuilder.DropTable(
                name: "Encomendas");

            migrationBuilder.DropTable(
                name: "Lancamentos");

            migrationBuilder.DropTable(
                name: "OrdensServico");

            migrationBuilder.DropTable(
                name: "Reservas");

            migrationBuilder.DropTable(
                name: "Usuarios");

            migrationBuilder.DropTable(
                name: "Visitantes");

            migrationBuilder.DropTable(
                name: "VotosRegistrados");

            migrationBuilder.DropTable(
                name: "Prestadores");

            migrationBuilder.DropTable(
                name: "Unidades");

            migrationBuilder.DropTable(
                name: "OpcoesVotacao");

            migrationBuilder.DropTable(
                name: "Votacoes");
        }
    }
}
