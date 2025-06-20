using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace conViver.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddOcorrenciasFeature : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Ocorrencias",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Titulo = table.Column<string>(type: "TEXT", nullable: false),
                    Descricao = table.Column<string>(type: "TEXT", nullable: false),
                    Categoria = table.Column<string>(type: "TEXT", nullable: false),
                    Status = table.Column<string>(type: "TEXT", nullable: false),
                    Prioridade = table.Column<string>(type: "TEXT", nullable: false),
                    DataAbertura = table.Column<DateTime>(type: "TEXT", nullable: false),
                    DataAtualizacao = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UsuarioId = table.Column<Guid>(type: "TEXT", nullable: false),
                    UnidadeId = table.Column<Guid>(type: "TEXT", nullable: true),
                    CondominioId = table.Column<Guid>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Ocorrencias", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Ocorrencias_Condominios_CondominioId",
                        column: x => x.CondominioId,
                        principalTable: "Condominios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Ocorrencias_Unidades_UnidadeId",
                        column: x => x.UnidadeId,
                        principalTable: "Unidades",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Ocorrencias_Usuarios_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "OcorrenciaAnexos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    OcorrenciaId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Url = table.Column<string>(type: "TEXT", nullable: false),
                    NomeArquivo = table.Column<string>(type: "TEXT", nullable: false),
                    Tipo = table.Column<string>(type: "TEXT", nullable: false),
                    Tamanho = table.Column<long>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OcorrenciaAnexos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OcorrenciaAnexos_Ocorrencias_OcorrenciaId",
                        column: x => x.OcorrenciaId,
                        principalTable: "Ocorrencias",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "OcorrenciaComentarios",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    OcorrenciaId = table.Column<Guid>(type: "TEXT", nullable: false),
                    UsuarioId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Texto = table.Column<string>(type: "TEXT", nullable: false),
                    Data = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OcorrenciaComentarios", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OcorrenciaComentarios_Ocorrencias_OcorrenciaId",
                        column: x => x.OcorrenciaId,
                        principalTable: "Ocorrencias",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_OcorrenciaComentarios_Usuarios_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "OcorrenciaStatusHistoricos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    OcorrenciaId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Status = table.Column<string>(type: "TEXT", nullable: false),
                    AlteradoPorId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Data = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OcorrenciaStatusHistoricos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OcorrenciaStatusHistoricos_Ocorrencias_OcorrenciaId",
                        column: x => x.OcorrenciaId,
                        principalTable: "Ocorrencias",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_OcorrenciaStatusHistoricos_Usuarios_AlteradoPorId",
                        column: x => x.AlteradoPorId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_OcorrenciaAnexos_OcorrenciaId",
                table: "OcorrenciaAnexos",
                column: "OcorrenciaId");

            migrationBuilder.CreateIndex(
                name: "IX_OcorrenciaComentarios_OcorrenciaId",
                table: "OcorrenciaComentarios",
                column: "OcorrenciaId");

            migrationBuilder.CreateIndex(
                name: "IX_OcorrenciaComentarios_UsuarioId",
                table: "OcorrenciaComentarios",
                column: "UsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_Ocorrencias_CondominioId",
                table: "Ocorrencias",
                column: "CondominioId");

            migrationBuilder.CreateIndex(
                name: "IX_Ocorrencias_UnidadeId",
                table: "Ocorrencias",
                column: "UnidadeId");

            migrationBuilder.CreateIndex(
                name: "IX_Ocorrencias_UsuarioId",
                table: "Ocorrencias",
                column: "UsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_OcorrenciaStatusHistoricos_AlteradoPorId",
                table: "OcorrenciaStatusHistoricos",
                column: "AlteradoPorId");

            migrationBuilder.CreateIndex(
                name: "IX_OcorrenciaStatusHistoricos_OcorrenciaId",
                table: "OcorrenciaStatusHistoricos",
                column: "OcorrenciaId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OcorrenciaAnexos");

            migrationBuilder.DropTable(
                name: "OcorrenciaComentarios");

            migrationBuilder.DropTable(
                name: "OcorrenciaStatusHistoricos");

            migrationBuilder.DropTable(
                name: "Ocorrencias");
        }
    }
}
