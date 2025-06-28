using System.Security.Cryptography;
using System.Text;
using conViver.Infrastructure.Cache;

namespace conViver.API.Middleware;

public class CachingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<CachingMiddleware> _logger;
    private readonly RedisCacheService _cache;

    public CachingMiddleware(RequestDelegate next, ILogger<CachingMiddleware> logger, RedisCacheService cache)
    {
        _next = next;
        _logger = logger;
        _cache = cache;
    }

    public async Task Invoke(HttpContext context)
    {
        if (!HttpMethods.IsGet(context.Request.Method))
        {
            await _next(context);
            return;
        }

        var cacheKey = $"etag:{context.Request.Path}{context.Request.QueryString}";
        var storedEtag = await _cache.GetAsync(cacheKey);

        if (storedEtag != null && context.Request.Headers.TryGetValue("If-None-Match", out var requestEtag) && requestEtag == storedEtag)
        {
            context.Response.StatusCode = StatusCodes.Status304NotModified;
            return;
        }

        var originalBody = context.Response.Body;
        await using var memStream = new MemoryStream();
        context.Response.Body = memStream;

        await _next(context);

        memStream.Seek(0, SeekOrigin.Begin);
        var bodyText = await new StreamReader(memStream).ReadToEndAsync();
        var eTag = GenerateETag(bodyText);
        context.Response.Headers["ETag"] = eTag;
        await _cache.SetAsync(cacheKey, eTag, TimeSpan.FromMinutes(5));

        memStream.Seek(0, SeekOrigin.Begin);
        await memStream.CopyToAsync(originalBody);
        context.Response.Body = originalBody;
    }

    private static string GenerateETag(string input)
    {
        using var sha = SHA256.Create();
        var bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(input));
        return Convert.ToBase64String(bytes);
    }
}
