using Xunit;
using Microsoft.AspNetCore.Mvc.Testing;
using System.Net.Http;
using System.Net.Http.Json; // For PostAsJsonAsync and ReadFromJsonAsync
using System.Threading.Tasks;
using conViver.Core.DTOs; // For LoginRequest and potentially a LoginResponse DTO
using FluentAssertions; // For assertions
using Microsoft.Extensions.DependencyInjection; // For GetService
using Microsoft.EntityFrameworkCore; // For DbContextOptions and AsNoTracking() etc.
using conViver.Infrastructure.Data.Contexts; // For ConViverDbContext
using System.Linq; // For Linq operations on services
using Microsoft.Extensions.Hosting; // For IHost
using System; // For Guid
using BCryptNet = BCrypt.Net.BCrypt; // Alias for BCrypt

// Define a placeholder for the API's Program class if it's not directly accessible
// or if a specific namespace is needed. For now, assume conViver.API.Program.
// If conViver.API.Program is internal, WebApplicationFactory might need InternalsVisibleTo.
// Let's assume 'Program' from conViver.API is accessible.
// If not, this might be 'conViver.API.Program' or require adjustments.
// For the purpose of this tool, direct reference to 'Program' from the API project is assumed.

namespace conViver.Tests.API
{
    // A custom WebApplicationFactory to configure services for tests, e.g., in-memory DB
    public class CustomWebApplicationFactory<TProgram> : WebApplicationFactory<TProgram> where TProgram : class
    {
        protected override void ConfigureWebHost(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder)
        {
            builder.ConfigureServices(services =>
            {
                // Remove the app's DbContext registration.
                var descriptor = services.SingleOrDefault(
                    d => d.ServiceType ==
                        typeof(DbContextOptions<ConViverDbContext>));

                if (descriptor != null)
                {
                    services.Remove(descriptor);
                }

                // Add DbContext using an in-memory database for testing.
                services.AddDbContext<ConViverDbContext>(options =>
                {
                    options.UseInMemoryDatabase($"InMemoryDbForTesting-{System.Guid.NewGuid()}");
                });

                // Ensure DataSeeder runs for each test instance of the factory/server if needed,
                // or rely on it running once if the DB is persisted across tests (not typical for in-memory unique dbs).
                // The original Program.cs runs DataSeeder after app.Build().
                // This approach with UseInMemoryDatabase per factory instance should give a fresh DB.
                // We need to ensure DataSeeder is called.
            });

            builder.UseEnvironment("Development"); // Or "Testing" if you have specific test configurations
        }

        // Optional: Override CreateHost to seed data after host is built
        protected override IHost CreateHost(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder)
        {
            var host = base.CreateHost(builder);

            // Seed the database after the host is built and services are configured.
            using (var scope = host.Services.CreateScope())
            {
                var services = scope.ServiceProvider;
                var dbContext = services.GetRequiredService<ConViverDbContext>();
                //dbContext.Database.EnsureDeleted(); // Ensure clean state if DB name is not unique per test/run
                dbContext.Database.EnsureCreated(); // Creates the schema for in-memory
                DataSeeder.Seed(dbContext); // Seed the admin user
            }
            return host;
        }
    }

    public class AuthControllerTests : IClassFixture<CustomWebApplicationFactory<Program>> // Assuming Program from conViver.API
    {
        private readonly HttpClient _client;
        private readonly CustomWebApplicationFactory<Program> _factory; // Store factory to access services

        public AuthControllerTests(CustomWebApplicationFactory<Program> factory)
        {
            _factory = factory; // Store factory
            _client = factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                BaseAddress = new System.Uri("http://localhost/api/v1/") // Set base address
            });
        }

        [Fact]
        public async Task Login_WithValidAdminCredentials_ShouldReturnOkAndAccessToken()
        {
            // Arrange
            var loginRequest = new LoginRequest
            {
                Email = "admin@conviver.local",
                Senha = "admin123"
            };

            // Act
            var response = await _client.PostAsJsonAsync("auth/login", loginRequest);

            // Assert
            response.EnsureSuccessStatusCode(); // Status Code 200-299
            response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);

            var loginResponse = await response.Content.ReadFromJsonAsync<AuthResponseDto>();
            loginResponse.Should().NotBeNull();
            loginResponse?.AccessToken.Should().NotBeNullOrEmpty();

            // Optional: Verify parts of the UsuarioResponse if it's included and relevant
            loginResponse?.Usuario.Should().NotBeNull();
            loginResponse?.Usuario?.Email.Should().Be(loginRequest.Email);
            // Assuming UsuarioResponse.Perfil is a string, and admin profile is "Administrador"
            // Adjust if Perfil is an enum or has different string representation in UsuarioResponse
            // loginResponse?.Usuario?.Perfil.Should().Be("Administrador"); // UserDto.Perfil is string
        }

        // TestLoginResponse class removed, using AuthResponseDto from Core.DTOs

        [Fact]
        public async Task Login_WithInvalidPassword_ShouldReturnUnauthorized()
        {
            // Arrange
            var loginRequest = new LoginRequest
            {
                Email = "admin@conviver.local", // Valid user seeded by DataSeeder
                Senha = "wrongpassword"
            };

            // Act
            var response = await _client.PostAsJsonAsync("auth/login", loginRequest);

            // Assert
            response.StatusCode.Should().Be(System.Net.HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task Login_WithNonExistentUser_ShouldReturnUnauthorized()
        {
            // Arrange
            var loginRequest = new LoginRequest
            {
                Email = "nonexistent@example.com",
                Senha = "anypassword"
            };

            // Act
            var response = await _client.PostAsJsonAsync("auth/login", loginRequest);

            // Assert
            response.StatusCode.Should().Be(System.Net.HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task Signup_WithValidData_ShouldReturnCreatedAndUser()
        {
            // Arrange
            var uniqueEmail = $"newuser_{Guid.NewGuid()}@example.com";
            var signupRequest = new SignupRequestDto
            {
                Nome = "New User",
                Email = uniqueEmail,
                Senha = "password123",
                CondominioId = Guid.NewGuid(), // Added
                UnidadeId = Guid.NewGuid()      // Added
            };

            // Act
            var response = await _client.PostAsJsonAsync("auth/signup", signupRequest);

            // Assert
            response.EnsureSuccessStatusCode();
            response.StatusCode.Should().Be(System.Net.HttpStatusCode.Created);

            var signupResponse = await response.Content.ReadFromJsonAsync<SignupResponseDto>();
            signupResponse.Should().NotBeNull();
            signupResponse?.Email.Should().Be(uniqueEmail);
            signupResponse?.Id.Should().NotBeEmpty();

            // Optional: Verify user in DB
            using var scope = _factory.Services.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<ConViverDbContext>();
            var userInDb = await dbContext.Usuarios.FirstOrDefaultAsync(u => u.Email == uniqueEmail);
            userInDb.Should().NotBeNull();
            userInDb?.Nome.Should().Be(signupRequest.Nome);
        }

        [Fact]
        public async Task Signup_WithExistingEmail_ShouldReturnConflict()
        {
            // Arrange
            var existingEmail = $"existinguser_{Guid.NewGuid()}@example.com";
            var firstSignupRequest = new SignupRequestDto
            {
                Nome = "Existing User",
                Email = existingEmail,
                Senha = "password123",
                CondominioId = Guid.NewGuid(), // Added
                UnidadeId = Guid.NewGuid()      // Added
            };
            // First, create the user
            var firstResponse = await _client.PostAsJsonAsync("auth/signup", firstSignupRequest);
            firstResponse.EnsureSuccessStatusCode();

            var secondSignupRequest = new SignupRequestDto
            {
                Nome = "Another User",
                Email = existingEmail, // Same email
                Senha = "password456",
                CondominioId = Guid.NewGuid(), // Added
                UnidadeId = Guid.NewGuid()      // Added
            };

            // Act
            var secondResponse = await _client.PostAsJsonAsync("auth/signup", secondSignupRequest);

            // Assert
            secondResponse.StatusCode.Should().Be(System.Net.HttpStatusCode.Conflict);
        }

        [Fact]
        public async Task ForgotPassword_WithExistingEmail_ShouldReturnOk()
        {
            // Arrange
            // Ensure admin user is seeded, or create one
            var adminEmail = "admin@conviver.local"; // Assuming this user exists from DataSeeder
            var forgotPasswordDto = new ForgotPasswordRequestDto { Email = adminEmail };

            // Act
            var response = await _client.PostAsJsonAsync("auth/forgot-password", forgotPasswordDto);

            // Assert
            response.EnsureSuccessStatusCode();
            response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
            var messageResponse = await response.Content.ReadFromJsonAsync<MessageResponseDto>(); // Assuming a generic DTO for messages
            messageResponse?.Message.Should().Be("Se um usuário com este e-mail existir em nosso sistema, um link para redefinição de senha foi enviado.");

            // Verify in DB
            using var scope = _factory.Services.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<ConViverDbContext>();
            var userInDb = await dbContext.Usuarios.FirstOrDefaultAsync(u => u.Email == adminEmail);
            userInDb.Should().NotBeNull();
            userInDb?.PasswordResetToken.Should().NotBeNullOrEmpty();
            userInDb?.PasswordResetTokenExpiry.Should().HaveValue().And.BeCloseTo(DateTime.UtcNow.AddHours(1), TimeSpan.FromMinutes(5));
        }

        [Fact]
        public async Task ForgotPassword_WithNonExistingEmail_ShouldReturnOk()
        {
            // Arrange
            var forgotPasswordDto = new ForgotPasswordRequestDto { Email = "nonexistent@example.com" };

            // Act
            var response = await _client.PostAsJsonAsync("auth/forgot-password", forgotPasswordDto);

            // Assert
            response.EnsureSuccessStatusCode();
            response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
            var messageResponse = await response.Content.ReadFromJsonAsync<MessageResponseDto>();
            messageResponse?.Message.Should().Be("Se um usuário com este e-mail existir em nosso sistema, um link para redefinição de senha foi enviado.");
        }

        [Fact]
        public async Task ResetPassword_WithValidTokenAndNewPassword_ShouldReturnOk()
        {
            // Arrange
            var userEmail = $"reset_user_{Guid.NewGuid()}@example.com";
            var signupRequest = new SignupRequestDto { Nome = "Reset User", Email = userEmail, Senha = "oldPassword123" };
            await _client.PostAsJsonAsync("auth/signup", signupRequest); // 1. Create user

            await _client.PostAsJsonAsync("auth/forgot-password", new ForgotPasswordRequestDto { Email = userEmail }); // 2. Generate token

            string resetToken;
            string oldPasswordHash;
            using (var scope = _factory.Services.CreateScope())
            {
                var dbContext = scope.ServiceProvider.GetRequiredService<ConViverDbContext>();
                var user = await dbContext.Usuarios.AsNoTracking().FirstAsync(u => u.Email == userEmail); // Use AsNoTracking if just reading
                resetToken = user.PasswordResetToken;
                oldPasswordHash = user.SenhaHash;
            } // 3. Retrieve token

            resetToken.Should().NotBeNullOrEmpty();

            var newPassword = "newPassword456!";
            var resetPasswordDto = new ResetPasswordRequestDto { ResetToken = resetToken, NovaSenha = newPassword };

            // Act
            var response = await _client.PostAsJsonAsync("auth/reset-password", resetPasswordDto);

            // Assert
            response.EnsureSuccessStatusCode();
            response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
            var messageResponse = await response.Content.ReadFromJsonAsync<MessageResponseDto>();
            messageResponse?.Message.Should().Be("Senha redefinida com sucesso.");

            using (var scope = _factory.Services.CreateScope())
            {
                var dbContext = scope.ServiceProvider.GetRequiredService<ConViverDbContext>();
                var updatedUser = await dbContext.Usuarios.FirstAsync(u => u.Email == userEmail);
                updatedUser.PasswordResetToken.Should().BeNull();
                updatedUser.PasswordResetTokenExpiry.Should().BeNull();
                updatedUser.SenhaHash.Should().NotBe(oldPasswordHash);
                BCryptNet.Verify(newPassword, updatedUser.SenhaHash).Should().BeTrue();
            }
        }

        [Fact]
        public async Task ResetPassword_WithInvalidToken_ShouldReturnBadRequest()
        {
            // Arrange
            var resetPasswordDto = new ResetPasswordRequestDto { ResetToken = "invalid_token", NovaSenha = "newPassword123" };

            // Act
            var response = await _client.PostAsJsonAsync("auth/reset-password", resetPasswordDto);

            // Assert
            response.StatusCode.Should().Be(System.Net.HttpStatusCode.BadRequest);
            var errorResponse = await response.Content.ReadFromJsonAsync<ErrorResponseDto>(); // Assuming a generic error DTO
            errorResponse?.Error.Should().Be("RESET_FAILED"); // Or check message if more consistent
            errorResponse?.Message.Should().Be("Não foi possível redefinir a senha. O token pode ser inválido ou ter expirado.");
        }

        [Fact]
        public async Task Signup_WithMissingCondominioId_ReturnsBadRequest()
        {
            // Arrange
            var signupRequest = new SignupRequestDto
            {
                Nome = "Test User",
                Email = $"testuser_{Guid.NewGuid()}@example.com",
                Senha = "password123",
                CondominioId = null, // Missing CondominioId
                UnidadeId = Guid.NewGuid()
            };

            // Act
            var response = await _client.PostAsJsonAsync("auth/signup", signupRequest);

            // Assert
            response.StatusCode.Should().Be(System.Net.HttpStatusCode.BadRequest);
            var errorResponse = await response.Content.ReadFromJsonAsync<ErrorResponseDto>();
            errorResponse.Should().NotBeNull();
            errorResponse?.Error.Should().Be("MISSING_CONDOMINIO_ID");
            errorResponse?.Message.Should().Be("O CondominioId é obrigatório.");
        }

        [Fact]
        public async Task Signup_WithEmptyCondominioId_ReturnsBadRequest()
        {
            // Arrange
            var signupRequest = new SignupRequestDto
            {
                Nome = "Test User",
                Email = $"testuser_{Guid.NewGuid()}@example.com",
                Senha = "password123",
                CondominioId = Guid.Empty, // Empty CondominioId
                UnidadeId = Guid.NewGuid()
            };

            // Act
            var response = await _client.PostAsJsonAsync("auth/signup", signupRequest);

            // Assert
            response.StatusCode.Should().Be(System.Net.HttpStatusCode.BadRequest);
            var errorResponse = await response.Content.ReadFromJsonAsync<ErrorResponseDto>();
            errorResponse.Should().NotBeNull();
            errorResponse?.Error.Should().Be("MISSING_CONDOMINIO_ID");
            errorResponse?.Message.Should().Be("O CondominioId é obrigatório.");
        }

        [Fact]
        public async Task Signup_WithMissingUnidadeId_ReturnsBadRequest()
        {
            // Arrange
            var signupRequest = new SignupRequestDto
            {
                Nome = "Test User",
                Email = $"testuser_{Guid.NewGuid()}@example.com",
                Senha = "password123",
                CondominioId = Guid.NewGuid(),
                UnidadeId = null // Missing UnidadeId
            };

            // Act
            var response = await _client.PostAsJsonAsync("auth/signup", signupRequest);

            // Assert
            response.StatusCode.Should().Be(System.Net.HttpStatusCode.BadRequest);
            var errorResponse = await response.Content.ReadFromJsonAsync<ErrorResponseDto>();
            errorResponse.Should().NotBeNull();
            errorResponse?.Error.Should().Be("MISSING_UNIDADE_ID");
            errorResponse?.Message.Should().Be("O UnidadeId é obrigatório.");
        }

        [Fact]
        public async Task Signup_WithEmptyUnidadeId_ReturnsBadRequest()
        {
            // Arrange
            var signupRequest = new SignupRequestDto
            {
                Nome = "Test User",
                Email = $"testuser_{Guid.NewGuid()}@example.com",
                Senha = "password123",
                CondominioId = Guid.NewGuid(),
                UnidadeId = Guid.Empty // Empty UnidadeId
            };

            // Act
            var response = await _client.PostAsJsonAsync("auth/signup", signupRequest);

            // Assert
            response.StatusCode.Should().Be(System.Net.HttpStatusCode.BadRequest);
            var errorResponse = await response.Content.ReadFromJsonAsync<ErrorResponseDto>();
            errorResponse.Should().NotBeNull();
            errorResponse?.Error.Should().Be("MISSING_UNIDADE_ID");
            errorResponse?.Message.Should().Be("O UnidadeId é obrigatório.");
        }
    }

    // Helper DTOs for deserializing responses, if not already in Core.DTOs
    // It's better to use actual DTOs from Core.DTOs if they match.
    public class MessageResponseDto
    {
        public string Message { get; set; }
    }

    public class ErrorResponseDto
    {
        public string Error { get; set; } // Or "code", "type", etc.
        public string Message { get; set; }
        // public Dictionary<string, string[]> Errors { get; set; } // For validation errors
    }
}

// Note: The API project (conViver.API) might need to add:
// <ItemGroup>
//   <InternalsVisibleTo Include="conViver.Tests" />
// </ItemGroup>
// in its .csproj file if Program.cs or types used by WebApplicationFactory are internal.
// For the purpose of this tool, assume public accessibility or that InternalsVisibleTo is handled.

// Adjusting the Login_WithValidAdminCredentials_ShouldReturnOkAndAccessToken test to use TestLoginResponse
// This requires re-applying the first test with the new DTO.
// The tool does not allow multiple replace_with_git_merge_diff in one thought block.
// For now, I will submit this change and then re-apply the first test with the correct DTO in the next step.
// The previous implementation of Login_WithValidAdminCredentials_ShouldReturnOkAndAccessToken used a commented out LoginResponse.
// It should be: var loginResponse = await response.Content.ReadFromJsonAsync<TestLoginResponse>();
