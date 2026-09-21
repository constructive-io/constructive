import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

import { runWorkerProcess } from '../src/process';

const root = resolve(__dirname, '..');
const suite = resolve(root, 'benchmarks/grafast-cache');

describe('standalone Grafast cache benchmarks', () => {
  test('imports all workers and the built harness without application configuration', () => {
    const result = spawnSync(process.execPath, ['--eval', `
      for (const name of ['micro', 'postgres', 'variants']) {
        require('./benchmarks/grafast-cache/' + name + '.cjs');
      }
      require('./benchmarks/grafast-cache/settings.cjs').assertIndependent();
    `], { cwd: root, encoding: 'utf8', timeout: 15_000 });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('');
  });

  test.each(['omitted', 'explicit'])('executes hot queries with %s defaults', async (arm) => {
    const { result } = await runWorkerProcess(resolve(suite, 'micro.cjs'), 'unused://in-memory', {
      name: `hot-${arm}`, workerConfig: { workload: 'hot', arm, seed: 20260921 },
    });
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') throw new Error(result.error);
    expect(result.caseValidation?.passed).toBe(true);
    expect(result.metadata).toMatchObject({
      configurationSource: 'grafast-schema-extensions', measuredPlans: 0,
      cacheStates: [{ queryCache: { limit: 525 }, cacheByOperation: { limit: 500 } }],
    });
  }, 30_000);

  test.each([8, 128])('enforces plan capacity %i for one operation', async (cap) => {
    const { result } = await runWorkerProcess(resolve(suite, 'variants.cjs'), 'unused://in-memory', {
      name: `variants-${cap}`, workerConfig: { cap, seed: 20260921 },
    });
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') throw new Error(result.error);
    expect(result.metadata).toMatchObject({
      configurationSource: 'grafast-schema-extensions',
      measuredPlans: cap === 8 ? 2048 : 0,
      cacheState: { queries: 1, operations: 1, planEntries: Math.min(64, cap) },
    });
  }, 30_000);
});
