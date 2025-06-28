namespace conViver.API.Middleware;

public class ExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionMiddleware> _logger;

    public ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task Invoke(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception details: Type={ExceptionType}, Message={ExceptionMessage}", ex.GetType().Name, ex.Message);

            context.Response.ContentType = "application/json";

            if (ex is FluentValidation.ValidationException validationException)
            {
                _logger.LogWarning(ex, "Validation error occurred.");
                context.Response.StatusCode = StatusCodes.Status400BadRequest;
                var errors = validationException.Errors.Select(e => new { field = e.PropertyName, message = e.ErrorMessage });
                await context.Response.WriteAsJsonAsync(new { code = "VALIDATION_ERROR", message = "Um ou mais erros de validação ocorreram.", errors });
            }
            else if (ex is conViver.Application.Exceptions.NotFoundException notFoundException)
            {
                _logger.LogWarning(ex, "Resource not found: {NotFoundMessage}", notFoundException.Message);
                context.Response.StatusCode = StatusCodes.Status404NotFound;
                await context.Response.WriteAsJsonAsync(new { code = "NOT_FOUND", message = notFoundException.Message });
            }
            else if (ex is UnauthorizedAccessException unauthEx)
            {
                _logger.LogWarning(ex, "Unauthorized access: {Message}", unauthEx.Message);
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                await context.Response.WriteAsJsonAsync(new { code = "UNAUTHORIZED", message = unauthEx.Message });
            }
            else if (ex is InvalidOperationException invalidOp)
            {
                _logger.LogWarning(ex, "Invalid operation: {Message}", invalidOp.Message);
                context.Response.StatusCode = StatusCodes.Status400BadRequest;
                await context.Response.WriteAsJsonAsync(new { code = "INVALID_OPERATION", message = invalidOp.Message });
            }
            // Example for another specific exception type, e.g. UnauthorizedAccessException
            // else if (ex is UnauthorizedAccessException unauthEx)
            // {
            //     _logger.LogWarning(unauthEx, "Unauthorized access attempt.");
            //     context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            //     await context.Response.WriteAsJsonAsync(new { code = "UNAUTHORIZED_ACCESS", message = "Acesso não autorizado." });
            // }
            else // Fallback for unhandled exceptions
            {
                _logger.LogError(ex, "An unhandled exception has occurred.");
                context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                await context.Response.WriteAsJsonAsync(new { code = "INTERNAL_SERVER_ERROR", message = "Ocorreu um erro inesperado no servidor. Por favor, tente novamente mais tarde." });
            }
        }
    }
}

