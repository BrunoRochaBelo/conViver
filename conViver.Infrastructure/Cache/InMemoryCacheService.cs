using System;
using System.Threading.Tasks;
using conViver.Core.Interfaces;
using Microsoft.Extensions.Caching.Memory;

namespace conViver.Infrastructure.Cache;

public class InMemoryCacheService : ICacheService
{
    private readonly IMemoryCache _cache;

    public InMemoryCacheService(IMemoryCache cache)
    {
        _cache = cache;
    }

    public Task SetAsync(string key, string value, TimeSpan? expiry = null)
    {
        _cache.Set(key, value, expiry ?? TimeSpan.FromMinutes(5));
        return Task.CompletedTask;
    }

    public Task<string?> GetAsync(string key)
    {
        _cache.TryGetValue<string>(key, out var value);
        return Task.FromResult<string?>(value);
    }
}
