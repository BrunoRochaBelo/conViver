using StackExchange.Redis;
using conViver.Core.Interfaces;

namespace conViver.Infrastructure.Cache;

public class RedisCacheService : ICacheService
{
    private readonly IDatabase _db;

    public RedisCacheService(IConnectionMultiplexer connection)
    {
        _db = connection.GetDatabase();
    }

    public Task SetAsync(string key, string value, TimeSpan? expiry = null)
    {
        return _db.StringSetAsync(key, value, expiry);
    }

    public async Task<string?> GetAsync(string key)
    {
        var value = await _db.StringGetAsync(key);
        return value.HasValue ? value.ToString() : null;
    }
}
