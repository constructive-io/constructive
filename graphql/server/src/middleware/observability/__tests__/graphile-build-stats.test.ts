import {
  getGraphileBuildStats,
  GraphileBuildStatsManager,
  observeGraphileBuild,
  resetGraphileBuildStats,
} from '../graphile-build-stats';

describe('graphile build stats', () => {
  beforeEach(() => {
    resetGraphileBuildStats();
  });

  it('does not record events when disabled', async () => {
    await observeGraphileBuild(
      {
        cacheKey: 'svc:a',
        serviceKey: 'svc:a',
        databaseId: 'db1',
      },
      async () => 'ok',
      { enabled: false }
    );

    const stats = getGraphileBuildStats();
    expect(stats.started).toBe(0);
    expect(stats.succeeded).toBe(0);
    expect(stats.recentEvents).toHaveLength(0);
  });

  it('caps aggregate maps to avoid unbounded key growth', async () => {
    for (let i = 0; i < 130; i += 1) {
      await observeGraphileBuild(
        {
          cacheKey: `svc:${i}`,
          serviceKey: `svc:${i}`,
          databaseId: `db:${i}`,
        },
        async () => 'ok',
        { enabled: true }
      );
    }

    const stats = getGraphileBuildStats();
    expect(Object.keys(stats.byServiceKey)).toHaveLength(100);
    expect(stats.byServiceKey['svc:0']).toBeUndefined();
    expect(stats.byServiceKey['svc:129']).toBeDefined();
  });

  it('keeps concurrent server diagnostics isolated', async () => {
    const first = new GraphileBuildStatsManager();
    const second = new GraphileBuildStatsManager();

    await observeGraphileBuild(
      {
        cacheKey: 'first-cache',
        serviceKey: 'first-service',
        databaseId: 'first-db',
      },
      async () => 'ok',
      { enabled: true, stats: first }
    );

    expect(getGraphileBuildStats(first).started).toBe(1);
    expect(getGraphileBuildStats(second).started).toBe(0);
    expect(getGraphileBuildStats(second).recentEvents).toEqual([]);
  });
});
