import type { GraphQLSchemaConfig } from 'graphql';

import {
  applyGrafastCacheLimits,
  createGrafastCacheLimitsPlugin,
  createGrafastCacheLimitsPreset,
  normalizeGrafastCacheLimits
} from '../src/grafast-cache-limits';

const schemaConfig = (): GraphQLSchemaConfig => ({
  extensions: {
    existing: true,
    grafast: { queryCacheMaxLength: 99 }
  }
});

describe('Grafast schema-local cache limits', () => {
  it('preserves unrelated schema and Grafast extensions', () => {
    const result = applyGrafastCacheLimits(schemaConfig(), {
      operationsCacheMaxLength: 16,
      operationOperationPlansCacheMaxLength: 8
    });

    expect(result.extensions).toMatchObject({
      existing: true,
      grafast: {
        queryCacheMaxLength: 99,
        operationsCacheMaxLength: 16,
        operationOperationPlansCacheMaxLength: 8
      }
    });
  });

  it.each([0, 1, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    'rejects an unsafe bound %s',
    (value) => {
      expect(() => normalizeGrafastCacheLimits({
        operationsCacheMaxLength: value
      })).toThrow('must be a safe integer of at least 2');
    }
  );

  it('installs a reusable GraphQLSchema hook', () => {
    const plugin = createGrafastCacheLimitsPlugin({ operationsCacheMaxLength: 8 });
    const hook = plugin.schema?.hooks?.GraphQLSchema;
    expect(typeof hook).toBe('function');

    const result = (hook as Function)(schemaConfig(), {}, {});
    expect(result.extensions?.grafast?.operationsCacheMaxLength).toBe(8);
  });

  it('is inert when no limits are configured', () => {
    expect(createGrafastCacheLimitsPreset({})).toEqual({});
  });
});
