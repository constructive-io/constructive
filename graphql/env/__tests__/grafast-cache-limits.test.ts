import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { getGraphQLEnvVars } from '../src/env';
import { normalizeGrafastCacheLimits } from '../src/grafast-cache-limits';
import { getEnvOptions } from '../src/merge';

describe('Grafast cache-limit configuration', () => {
  it('normalizes a partial configuration into an immutable copy', () => {
    const input = {
      queryCacheMaxLength: 64,
      operationOperationPlansCacheMaxLength: 8,
    };

    const normalized = normalizeGrafastCacheLimits(input);
    input.queryCacheMaxLength = 128;

    expect(normalized).toEqual({
      queryCacheMaxLength: 64,
      operationOperationPlansCacheMaxLength: 8,
    });
    expect(Object.isFrozen(normalized)).toBe(true);
  });

  it.each([0, 1, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, Infinity, NaN])(
    'rejects an unsafe bound %s',
    (value) => {
      expect(() =>
        normalizeGrafastCacheLimits({ operationsCacheMaxLength: value })
      ).toThrow(
        'graphile.grafastCache.operationsCacheMaxLength must be a safe integer of at least 2'
      );
    }
  );

  it('rejects malformed objects and unknown settings', () => {
    expect(() => normalizeGrafastCacheLimits([] as unknown as {})).toThrow(
      'graphile.grafastCache must be an object'
    );
    expect(() =>
      normalizeGrafastCacheLimits({
        queryCacheMaximum: 8,
      } as unknown as {})
    ).toThrow("contains unsupported setting 'queryCacheMaximum'");
  });

  it('maps all three environment variables', () => {
    expect(
      getGraphQLEnvVars({
        GRAPHILE_QUERY_CACHE_MAX_LENGTH: '64',
        GRAPHILE_OPERATIONS_CACHE_MAX_LENGTH: '32',
        GRAPHILE_OPERATION_PLANS_CACHE_MAX_LENGTH: '8',
      }).graphile?.grafastCache
    ).toEqual({
      queryCacheMaxLength: 64,
      operationsCacheMaxLength: 32,
      operationOperationPlansCacheMaxLength: 8,
    });
  });

  it.each(['', '0', '1', '-1', '1.5', '12entries'])(
    'rejects an invalid environment bound %s',
    (value) => {
      expect(() =>
        getGraphQLEnvVars({ GRAPHILE_OPERATIONS_CACHE_MAX_LENGTH: value })
      ).toThrow(
        'GRAPHILE_OPERATIONS_CACHE_MAX_LENGTH must be a safe integer of at least 2'
      );
    }
  );

  it('keeps the feature absent when no limit is configured', () => {
    expect(getGraphQLEnvVars({}).graphile?.grafastCache).toBeUndefined();
  });

  it('validates the final config, environment, and override merge', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'grafast-cache-'));
    try {
      fs.writeFileSync(
        path.join(tempDir, 'pgpm.json'),
        JSON.stringify({
          graphile: {
            grafastCache: {
              queryCacheMaxLength: 64,
              operationsCacheMaxLength: 64,
            },
          },
        })
      );

      const options = getEnvOptions(
        {
          graphile: {
            grafastCache: { operationOperationPlansCacheMaxLength: 8 },
          },
        },
        tempDir,
        { GRAPHILE_OPERATIONS_CACHE_MAX_LENGTH: '32' }
      );

      expect(options.graphile?.grafastCache).toEqual({
        queryCacheMaxLength: 64,
        operationsCacheMaxLength: 32,
        operationOperationPlansCacheMaxLength: 8,
      });
      expect(Object.isFrozen(options.graphile?.grafastCache)).toBe(true);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('rejects an invalid runtime override during final validation', () => {
    expect(() =>
      getEnvOptions(
        { graphile: { grafastCache: { queryCacheMaxLength: 1 } } },
        process.cwd(),
        {}
      )
    ).toThrow(
      'graphile.grafastCache.queryCacheMaxLength must be a safe integer of at least 2'
    );
  });
});
