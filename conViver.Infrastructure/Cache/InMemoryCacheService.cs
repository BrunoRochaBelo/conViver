using System.Collections.Concurrent;

namespace conViver.Infrastructure.Cache;

public class InMemoryCacheService : ICacheService
{
    private readonly ConcurrentDictionary<string, CacheEntry> _cache = new();

    public Task SetAsync(string key, string value, TimeSpan? expiry = null)
    {
        var expiresAt = expiry.HasValue ? DateTimeOffset.UtcNow.Add(expiry.Value) : (DateTimeOffset?)null;
        _cache[key] = new CacheEntry(value, expiresAt);
        return Task.CompletedTask;
    }

    public Task<string?> GetAsync(string key)
    {
        if (_cache.TryGetValue(key, out var entry))
        {
            if (entry.ExpiresAt.HasValue && entry.ExpiresAt.Value < DateTimeOffset.UtcNow)
            {
                _cache.TryRemove(key, out _);
                return Task.FromResult<string?>(null);
            }
            return Task.FromResult<string?>(entry.Value);
        }
        return Task.FromResult<string?>(null);
    }

    private record CacheEntry(string Value, DateTimeOffset? ExpiresAt);
}
