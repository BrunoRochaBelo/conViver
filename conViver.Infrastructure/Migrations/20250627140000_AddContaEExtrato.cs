using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace conViver.Infrastructure.Migrations
{
    public partial class AddContaEExtrato : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ContasBancarias",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Banco = table.Column<string>(type: "TEXT", nullable: false),
                    Agencia = table.Column<string>(type: "TEXT", nullable: false),
                    Conta = table.Column<string>(type: "TEXT", nullable: false),
                    SaldoAtual = table.Column<decimal>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContasBancarias", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ExtratosBancarios",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    ContaBancariaId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Tipo = table.Column<string>(type: "TEXT", nullable: false),
                    Valor = table.Column<decimal>(type: "TEXT", nullable: false),
                    Data = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Historico = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExtratosBancarios", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ExtratosBancarios_ContasBancarias_ContaBancariaId",
                        column: x => x.ContaBancariaId,
                        principalTable: "ContasBancarias",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ExtratosBancarios_ContaBancariaId",
                table: "ExtratosBancarios",
                column: "ContaBancariaId");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ExtratosBancarios");

            migrationBuilder.DropTable(
                name: "ContasBancarias");
        }
    }
}
