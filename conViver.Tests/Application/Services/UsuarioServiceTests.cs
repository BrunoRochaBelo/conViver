// Base structure for UsuarioServiceTests.cs
using Xunit;
using Moq;
using conViver.Core.Interfaces;
using conViver.Core.Entities;
using conViver.Core.Enums;
using conViver.Application; // Namespace for UsuarioService
using System;
using System.Collections.Generic; // Required for List
using System.Linq; // Required for AsQueryable
using System.Threading.Tasks;
using BCryptNet = BCrypt.Net.BCrypt; // Alias for clarity
using conViver.Application.Services; // Namespace for UsuarioService, corrected from conViver.Application

namespace conViver.Tests.Application.Services
{
    public class UsuarioServiceTests
    {
        private readonly Mock<IRepository<Usuario>> _mockUsuarioRepository;
        private readonly UsuarioService _usuarioService;

        public UsuarioServiceTests()
        {
            _mockUsuarioRepository = new Mock<IRepository<Usuario>>();
            // Corrected namespace for UsuarioService if it was wrong in the original file
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

        [Fact]
        public async Task SolicitarResetSenhaAsync_UserExists_ShouldSetTokenAndExpiryAndSaveChanges()
        {
            // Arrange
            var usuario = new Usuario
            {
                Id = Guid.NewGuid(),
                Nome = "Test User",
                Email = "test@example.com",
                SenhaHash = "hashedpassword",
                Perfil = PerfilUsuario.Morador
            };

            var usersList = new List<Usuario> { usuario };
            _mockUsuarioRepository
                .Setup(r => r.Query())
                .Returns(usersList.AsQueryable());

            _mockUsuarioRepository
                .Setup(r => r.Update(It.IsAny<Usuario>())); // Assuming Update is void or its return is not critical here

            _mockUsuarioRepository
                .Setup(r => r.SaveChangesAsync(default))
                .ReturnsAsync(1);

            Usuario capturedUsuario = null;
            _mockUsuarioRepository.Setup(r => r.Update(It.IsAny<Usuario>()))
                                 .Callback<Usuario>(u => capturedUsuario = u);

            // Act
            await _usuarioService.SolicitarResetSenhaAsync(usuario.Email);

            // Assert
            _mockUsuarioRepository.Verify(r => r.Update(It.IsAny<Usuario>()), Times.Once);
             Assert.NotNull(capturedUsuario);
            Assert.NotNull(capturedUsuario.PasswordResetToken);
            Assert.True(capturedUsuario.PasswordResetTokenExpiry.HasValue);
            Assert.True(capturedUsuario.PasswordResetTokenExpiry.Value > DateTime.UtcNow.AddMinutes(-5)); // Check it's recent & future
            Assert.True(capturedUsuario.PasswordResetTokenExpiry.Value <= DateTime.UtcNow.AddHours(1).AddMinutes(5)); // Check it's around 1 hour

            _mockUsuarioRepository.Verify(r => r.SaveChangesAsync(default), Times.Once);
        }

        [Fact]
        public async Task SolicitarResetSenhaAsync_UserDoesNotExist_ShouldNotSaveChanges()
        {
            // Arrange
            var usersList = new List<Usuario>(); // Empty list
            _mockUsuarioRepository
                .Setup(r => r.Query())
                .Returns(usersList.AsQueryable());

            // Act
            await _usuarioService.SolicitarResetSenhaAsync("nonexistent@example.com");

            // Assert
            _mockUsuarioRepository.Verify(r => r.Update(It.IsAny<Usuario>()), Times.Never);
            _mockUsuarioRepository.Verify(r => r.SaveChangesAsync(default), Times.Never);
        }

        [Fact]
        public async Task ResetarSenhaAsync_ValidToken_ShouldUpdatePasswordAndClearTokenAndSaveChanges()
        {
            // Arrange
            var originalPasswordHash = BCryptNet.HashPassword("oldPassword");
            var resetToken = "valid_reset_token";
            var usuario = new Usuario
            {
                Id = Guid.NewGuid(),
                Email = "test@example.com",
                SenhaHash = originalPasswordHash,
                PasswordResetToken = resetToken,
                PasswordResetTokenExpiry = DateTime.UtcNow.AddHours(1)
            };

            var usersList = new List<Usuario> { usuario };
            _mockUsuarioRepository
                .Setup(r => r.Query())
                .Returns(usersList.AsQueryable());

            _mockUsuarioRepository.Setup(r => r.SaveChangesAsync(default)).ReturnsAsync(1);

            Usuario capturedUsuario = null;
            _mockUsuarioRepository.Setup(r => r.Update(It.IsAny<Usuario>()))
                                 .Callback<Usuario>(u => capturedUsuario = u);

            var novaSenha = "newPassword123";

            // Act
            var result = await _usuarioService.ResetarSenhaAsync(resetToken, novaSenha);

            // Assert
            Assert.True(result);
            _mockUsuarioRepository.Verify(r => r.Update(It.IsAny<Usuario>()), Times.Once);
            Assert.NotNull(capturedUsuario);
            Assert.NotEqual(originalPasswordHash, capturedUsuario.SenhaHash);
            Assert.True(BCryptNet.Verify(novaSenha, capturedUsuario.SenhaHash));
            Assert.Null(capturedUsuario.PasswordResetToken);
            Assert.Null(capturedUsuario.PasswordResetTokenExpiry);
            _mockUsuarioRepository.Verify(r => r.SaveChangesAsync(default), Times.Once);
        }

        [Theory]
        [InlineData("non_existent_token", false)] // Scenario 1: Token does not exist in DB
        [InlineData("expired_test_token", true)]  // Scenario 2: Token exists but is expired
        public async Task ResetarSenhaAsync_InvalidOrExpiredToken_ShouldReturnFalseAndNotSaveChanges(string tokenToTest, bool tokenShouldExistAndBeExpired)
        {
            // Arrange
            var originalPasswordHash = BCryptNet.HashPassword("oldPassword");
            Usuario usuarioToReturn = null;
            var usersList = new List<Usuario>();

            if (tokenShouldExistAndBeExpired)
            {
                // Setup for an existing but expired token
                usuarioToReturn = new Usuario
                {
                    Id = Guid.NewGuid(),
                    Email = "test@example.com",
                    SenhaHash = originalPasswordHash,
                    PasswordResetToken = tokenToTest, // e.g., "expired_test_token"
                    PasswordResetTokenExpiry = DateTime.UtcNow.AddMinutes(-10) // Expired
                };
                usersList.Add(usuarioToReturn);
            }
            // If tokenShouldExistAndBeExpired is false, usersList remains empty,
            // simulating that no user is found with tokenToTest (e.g., "non_existent_token").

            _mockUsuarioRepository
                .Setup(r => r.Query())
                .Returns(usersList.AsQueryable());

            var novaSenha = "newPassword123";

            // Act
            var result = await _usuarioService.ResetarSenhaAsync(tokenToTest, novaSenha);

            // Assert
            Assert.False(result);
            _mockUsuarioRepository.Verify(r => r.Update(It.IsAny<Usuario>()), Times.Never);
            _mockUsuarioRepository.Verify(r => r.SaveChangesAsync(default), Times.Never);
        }
    }
}
