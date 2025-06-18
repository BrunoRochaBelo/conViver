using Microsoft.AspNetCore.Mvc;
using conViver.Core.Entities;
using conViver.Core.Enums;
using conViver.Core.DTOs;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

var app = builder.Build();

app.MapControllers();

app.Run();
