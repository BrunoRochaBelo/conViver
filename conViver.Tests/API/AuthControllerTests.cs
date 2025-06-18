using Xunit;
using Microsoft.AspNetCore.Mvc.Testing;
using System.Net.Http;
using System.Net.Http.Json; // For PostAsJsonAsync and ReadFromJsonAsync
using System.Threading.Tasks;
using conViver.Core.DTOs; // For LoginRequest and potentially a LoginResponse DTO
using FluentAssertions; // For assertions
using Microsoft.Extensions.DependencyInjection; // For GetService
using Microsoft.EntityFrameworkCore; // For DbContextOptions
using conViver.Infrastructure.Data.Contexts; // For ConViverDbContext
using System.Linq; // For Linq operations on services
using Microsoft.Extensions.Hosting; // For IHost

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

        public AuthControllerTests(CustomWebApplicationFactory<Program> factory)
        {
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

            var loginResponse = await response.Content.ReadFromJsonAsync<TestLoginResponse>(); // Corrected to TestLoginResponse
            loginResponse.Should().NotBeNull();
            loginResponse?.AccessToken.Should().NotBeNullOrEmpty();

            // Optional: Verify parts of the UsuarioResponse if it's included and relevant
            loginResponse?.Usuario.Should().NotBeNull();
            loginResponse?.Usuario?.Email.Should().Be(loginRequest.Email);
            // Assuming UsuarioResponse.Perfil is a string, and admin profile is "Administrador"
            // Adjust if Perfil is an enum or has different string representation in UsuarioResponse
            // loginResponse?.Usuario?.Perfil.Should().Be("Administrador");
        }

        // Placeholder for LoginResponse if not already defined in Core.DTOs
        // Local DTO for test deserialization if not available globally or structure is specific
        public class TestLoginResponse
        {
            public string AccessToken { get; set; }
            public UsuarioResponse? Usuario { get; set; } // Assuming UsuarioResponse is from Core.DTOs
        }

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
