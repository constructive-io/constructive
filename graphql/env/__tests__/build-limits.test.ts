import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { normalizeGraphileBuildLimits } from '../src/build-limits';
import { getGraphQLEnvVars } from '../src/env';
import { getEnvOptions } from '../src/merge';

describe('Graphile build-limit configuration', () => {
  it('leaves the bounds to the server defaults when nothing is configured', () => {
    expect(getEnvOptions({}, process.cwd(), {}).graphile?.buildLimits).toBeUndefined();
  });

  it('normalizes a partial configuration into an immutable copy', () => {
    const input = { concurrency: 4, queueWaitMs: 0 };
    const normalized = normalizeGraphileBuildLimits(input);
    input.concurrency = 8;

    expect(normalized).toEqual({ concurrency: 4, queueWaitMs: 0 });
    expect(Object.isFrozen(normalized)).toBe(true);
  });

  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, Infinity, NaN])(
    'rejects a concurrency of %s',
    (value) => {
      expect(() => normalizeGraphileBuildLimits({ concurrency: value })).toThrow(
        'graphile.buildLimits.concurrency must be a safe integer of at least 1'
      );
    }
  );

  it('accepts zero for the queue bounds and rejects waits setTimeout cannot honour', () => {
    expect(normalizeGraphileBuildLimits({ queueMax: 0, queueWaitMs: 0 })).toEqual({
      queueMax: 0,
      queueWaitMs: 0
    });
    expect(normalizeGraphileBuildLimits({ queueWaitMs: 2_147_483_647 })).toEqual({
      queueWaitMs: 2_147_483_647
    });
    expect(() => normalizeGraphileBuildLimits({ queueWaitMs: 2_147_483_648 })).toThrow(
      'graphile.buildLimits.queueWaitMs must be an integer from 0 to 2147483647'
    );
    expect(() => normalizeGraphileBuildLimits({ queueMax: -1 })).toThrow(
      'graphile.buildLimits.queueMax must be a safe integer of at least 0'
    );
  });

  it('rejects malformed objects and unknown settings', () => {
    expect(() => normalizeGraphileBuildLimits([] as unknown as {})).toThrow(
      'graphile.buildLimits must be an object'
    );
    expect(() => normalizeGraphileBuildLimits(null as unknown as {})).toThrow(
      'graphile.buildLimits must be an object'
    );
    expect(() =>
      normalizeGraphileBuildLimits({ maxConcurrency: 4 } as unknown as {})
    ).toThrow("graphile.buildLimits contains unsupported setting 'maxConcurrency'");
  });

  it('maps all three environment variables', () => {
    expect(
      getGraphQLEnvVars({
        GRAPHILE_BUILD_CONCURRENCY: '3',
        GRAPHILE_BUILD_QUEUE_MAX: '0',
        GRAPHILE_BUILD_QUEUE_WAIT_MS: '15000'
      }).graphile?.buildLimits
    ).toEqual({ concurrency: 3, queueMax: 0, queueWaitMs: 15_000 });
  });

  it.each(['', '0', '-1', '1.5', 'two'])(
    'rejects an invalid GRAPHILE_BUILD_CONCURRENCY %p',
    (value) => {
      expect(() => getGraphQLEnvVars({ GRAPHILE_BUILD_CONCURRENCY: value })).toThrow(
        'GRAPHILE_BUILD_CONCURRENCY must be a safe integer of at least 1'
      );
    }
  );

  it('rejects an out-of-range GRAPHILE_BUILD_QUEUE_WAIT_MS', () => {
    expect(() => getGraphQLEnvVars({ GRAPHILE_BUILD_QUEUE_WAIT_MS: '2147483648' })).toThrow(
      'GRAPHILE_BUILD_QUEUE_WAIT_MS must be an integer from 0 to 2147483647'
    );
  });

  it('keeps the environment silent when no limit is set', () => {
    expect(getGraphQLEnvVars({}).graphile?.buildLimits).toBeUndefined();
  });

  it('merges config, environment and overrides before validating', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'graphile-build-limits-'));
    try {
      fs.writeFileSync(
        path.join(tempDir, 'pgpm.json'),
        JSON.stringify({ graphile: { buildLimits: { concurrency: 4, queueMax: 16 } } })
      );

      const options = getEnvOptions(
        { graphile: { buildLimits: { queueWaitMs: 5_000 } } },
        tempDir,
        { GRAPHILE_BUILD_QUEUE_MAX: '8' }
      );

      expect(options.graphile?.buildLimits).toEqual({
        concurrency: 4,
        queueMax: 8,
        queueWaitMs: 5_000
      });
      expect(Object.isFrozen(options.graphile?.buildLimits)).toBe(true);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('rejects an invalid runtime override during final validation', () => {
    expect(() =>
      getEnvOptions({ graphile: { buildLimits: { concurrency: 0 } } }, process.cwd(), {})
    ).toThrow('graphile.buildLimits.concurrency must be a safe integer of at least 1');
  });
});
