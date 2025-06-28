using System.Collections.Generic;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using conViver.Infrastructure;
using conViver.Core.Interfaces;
using conViver.Infrastructure.Cache;
using Xunit;

namespace conViver.Tests.Infrastructure;

public class CacheFallbackTests
{
    [Fact]
    public void AddInfrastructure_withoutRedis_ShouldUseInMemoryCache()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>())
            .Build();

        var services = new ServiceCollection();
        services.AddInfrastructure(config);
        var provider = services.BuildServiceProvider();

        var cache = provider.GetRequiredService<ICacheService>();
        cache.Should().BeOfType<InMemoryCacheService>();
    }
}
