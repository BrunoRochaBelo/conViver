using conViver.API.Middleware;
using conViver.Application;
using conViver.Infrastructure;
using conViver.Infrastructure.Data.Contexts;
using Microsoft.OpenApi.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using conViver.Application.Services; // Moved here

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddScoped<DashboardService>(); // Register DashboardService

// CORS Configuration
var AllowDevOrigins = "_allowDevOrigins";

var allowedOriginsString = builder.Configuration.GetSection("CorsSettings:AllowedOrigins").Value;
var origins = !string.IsNullOrWhiteSpace(allowedOriginsString)
              ? allowedOriginsString.Split(';', StringSplitOptions.RemoveEmptyEntries)
              : Array.Empty<string>();

builder.Services.AddCors(options =>
{
    options.AddPolicy(name: AllowDevOrigins, // Keep the same policy name
                      policy =>
                      {
                          if (origins.Length > 0)
                          {
                              policy.WithOrigins(origins)
                                    .AllowAnyHeader()
                                    .AllowAnyMethod();
                          }
                          else
                          {
                              // Fallback for development if no origins are configured
                              // Or throw an exception if origins are mandatory for production
                              policy.AllowAnyOrigin()
                                    .AllowAnyHeader()
                                    .AllowAnyMethod();
                              Console.WriteLine("WARN: CORS AllowedOrigins not configured in appsettings.json. Allowing any origin.");
                          }
                      });
});

builder.Services.AddAuthentication("Bearer")
    .AddJwtBearer("Bearer", options =>
    {
        options.TokenValidationParameters = new()
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(
                System.Text.Encoding.UTF8.GetBytes(builder.Configuration["JWT_SECRET"] ?? "changeme"))
        };
    });
builder.Services.AddAuthorization();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "conViver API", Version = "v1" });

    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = System.IO.Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (System.IO.File.Exists(xmlPath))
    {
        c.IncludeXmlComments(xmlPath);
    }

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = JwtBearerDefaults.AuthenticationScheme,
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Insira 'Bearer {token}' no campo de autorização"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ConViverDbContext>();
    // db.Database.EnsureCreated(); // Commented out to allow migrations to handle schema creation
    db.Database.Migrate();
    DataSeeder.Seed(db);
}

app.UsePathBase("/api/v1");

app.UseMiddleware<RequestLoggingMiddleware>();
app.UseMiddleware<ExceptionMiddleware>();

// Enable CORS
app.UseCors(AllowDevOrigins);

app.UseAuthentication();
app.UseAuthorization();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapControllers();

app.Run();
