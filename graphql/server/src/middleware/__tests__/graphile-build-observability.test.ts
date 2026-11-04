import { getGraphileBuildStats, observeGraphileBuild, resetGraphileBuildStats } from '../observability/graphile-build-stats';

it('retains the original build error while recording only its safe canonical code', async () => {
  resetGraphileBuildStats();
  const failure = new Error('private database password');
  await expect(observeGraphileBuild(
    { cacheKey: 'build-key', serviceKey: 'service', databaseId: 'database' },
    async () => { throw failure; },
    { enabled: true }
  )).rejects.toBe(failure);
  const stats = getGraphileBuildStats();
  expect(stats.lastError).toBe('INTERNAL_FAILURE');
  expect(JSON.stringify(stats)).not.toContain(failure.message);
  resetGraphileBuildStats();
});
