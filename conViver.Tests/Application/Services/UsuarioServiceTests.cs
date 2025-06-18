// Base structure for UsuarioServiceTests.cs
using Xunit;
using Moq;
using conViver.Core.Interfaces;
using conViver.Core.Entities;
using conViver.Core.Enums;
using conViver.Application; // Namespace for UsuarioService
using System;
using System.Threading.Tasks;
using BCryptNet = BCrypt.Net.BCrypt; // Alias for clarity

namespace conViver.Tests.Application.Services
{
    public class UsuarioServiceTests
    {
        private readonly Mock<IRepository<Usuario>> _mockUsuarioRepository;
        private readonly UsuarioService _usuarioService;

        public UsuarioServiceTests()
        {
            _mockUsuarioRepository = new Mock<IRepository<Usuario>>();
            _usuarioService = new UsuarioService(_mockUsuarioRepository.Object);
        }

        [Fact]
        public async Task AddAsync_NewUser_ShouldHashPasswordAndSaveChanges()
        {
            // Arrange
            var plainPassword = "password123";
            var usuario = new Usuario
            {
                Id = Guid.NewGuid(),
                Nome = "Test User",
                Email = "test@example.com",
                SenhaHash = plainPassword, // Service expects plain password here to hash it
                Perfil = PerfilUsuario.Administrador
            };

            // No need to capture, the original object's SenhaHash will be modified.
            _mockUsuarioRepository
                .Setup(r => r.AddAsync(usuario, default))
                .Returns(Task.CompletedTask);

            _mockUsuarioRepository
                .Setup(r => r.SaveChangesAsync(default))
                .ReturnsAsync(1);

            // Act
            await _usuarioService.AddAsync(usuario);

            // Assert
            _mockUsuarioRepository.Verify(r => r.AddAsync(usuario, default), Times.Once);
            _mockUsuarioRepository.Verify(r => r.SaveChangesAsync(default), Times.Once);

            Assert.NotNull(usuario.SenhaHash);
            Assert.NotEqual(plainPassword, usuario.SenhaHash);
            Assert.True(BCryptNet.Verify(plainPassword, usuario.SenhaHash));
        }

        [Fact]
        public async Task ValidatePasswordAsync_CorrectPassword_ShouldReturnTrue()
        {
            // Arrange
            var plainPassword = "password123";
            var hashedPassword = BCryptNet.HashPassword(plainPassword);
            var usuario = new Usuario
            {
                Id = Guid.NewGuid(),
                Email = "test@example.com",
                SenhaHash = hashedPassword
            };

            // Act
            var result = await _usuarioService.ValidatePasswordAsync(usuario, plainPassword);

            // Assert
            Assert.True(result);
        }

        [Fact]
        public async Task ValidatePasswordAsync_IncorrectPassword_ShouldReturnFalse()
        {
            // Arrange
            var plainPassword = "password123";
            var hashedPassword = BCryptNet.HashPassword(plainPassword);
            var usuario = new Usuario
            {
                Id = Guid.NewGuid(),
                Email = "test@example.com",
                SenhaHash = hashedPassword
            };

            var incorrectPassword = "wrongPassword";

            // Act
            var result = await _usuarioService.ValidatePasswordAsync(usuario, incorrectPassword);

            // Assert
            Assert.False(result);
        }

        // Test methods will be added here
    }
}
