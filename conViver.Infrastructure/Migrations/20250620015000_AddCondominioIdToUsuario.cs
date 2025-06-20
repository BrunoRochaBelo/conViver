using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace conViver.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCondominioIdToUsuario : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CondominioId",
                table: "Usuarios",
                type: "TEXT",
                nullable: false,
                defaultValue: Guid.Empty);

            migrationBuilder.CreateIndex(
                name: "IX_Usuarios_CondominioId",
                table: "Usuarios",
                column: "CondominioId");

            migrationBuilder.AddForeignKey(
                name: "FK_Usuarios_Condominios_CondominioId",
                table: "Usuarios",
                column: "CondominioId",
                principalTable: "Condominios",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Usuarios_Condominios_CondominioId",
                table: "Usuarios");

            migrationBuilder.DropIndex(
                name: "IX_Usuarios_CondominioId",
                table: "Usuarios");

            migrationBuilder.DropColumn(
                name: "CondominioId",
                table: "Usuarios");
        }
    }
}
