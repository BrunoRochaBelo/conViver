using System;
using System.Threading.Tasks;

namespace conViver.Core.Interfaces;

public interface ICacheService
{
    Task SetAsync(string key, string value, TimeSpan? expiry = null);
    Task<string?> GetAsync(string key);
}
