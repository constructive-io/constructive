import { grafastSync } from 'grafast';
import { buildSchema, GraphQLSchema, type GraphQLSchemaConfig } from 'graphql';

import {
  applyGrafastCacheLimits,
  createGrafastCacheLimitsPlugin,
  createGrafastCacheLimitsPreset,
} from '../src/grafast-cache-limits';

const schemaConfig = (): GraphQLSchemaConfig => ({
  extensions: {
    existing: true,
    grafast: { queryCacheMaxLength: 99 },
  },
});

describe('Grafast schema-local cache limits', () => {
  it('preserves unrelated schema and Grafast extensions', () => {
    const result = applyGrafastCacheLimits(schemaConfig(), {
      operationsCacheMaxLength: 16,
      operationOperationPlansCacheMaxLength: 8,
    });

    expect(result.extensions).toMatchObject({
      existing: true,
      grafast: {
        queryCacheMaxLength: 99,
        operationsCacheMaxLength: 16,
        operationOperationPlansCacheMaxLength: 8,
      },
    });
  });

  it('installs an immutable limit snapshot through the GraphQLSchema hook', () => {
    const limits = {
      queryCacheMaxLength: 16,
      operationsCacheMaxLength: 8,
      operationOperationPlansCacheMaxLength: 4,
    };
    const plugin = createGrafastCacheLimitsPlugin(limits);
    limits.operationsCacheMaxLength = 64;

    expect(plugin.name).toBe('GrafastCacheLimitsPlugin');
    const hook = plugin.schema?.hooks?.GraphQLSchema;
    expect(typeof hook).toBe('function');

    const result = (hook as Function)(schemaConfig(), {}, {});
    expect(result.extensions?.grafast).toMatchObject({
      queryCacheMaxLength: 16,
      operationsCacheMaxLength: 8,
      operationOperationPlansCacheMaxLength: 4,
    });
  });

  it('is inert when no limits are configured', () => {
    expect(createGrafastCacheLimitsPreset()).toEqual({});
    expect(createGrafastCacheLimitsPreset({})).toEqual({});
  });

  it('returns one plugin preset when at least one limit is configured', () => {
    const preset = createGrafastCacheLimitsPreset({ queryCacheMaxLength: 8 });

    expect(preset.plugins).toHaveLength(1);
    expect(preset.plugins?.[0].name).toBe('GrafastCacheLimitsPlugin');
  });

  it('bounds Grafast query and operation caches under query diversity', () => {
    const config = applyGrafastCacheLimits(
      buildSchema('type Query { hello: String }').toConfig(),
      {
        queryCacheMaxLength: 2,
        operationsCacheMaxLength: 2,
      }
    );
    const schema = new GraphQLSchema(config);

    for (let index = 0; index < 4; index += 1) {
      const result = grafastSync({
        schema,
        source: `query CacheCase${index} { hello }`,
        rootValue: { hello: 'world' },
      });
      expect(result.errors).toBeUndefined();
    }

    const grafastExtensions = schema.extensions.grafast as unknown as Record<
      symbol,
      { length?: number }
    >;
    const cacheLengths = Object.fromEntries(
      Object.getOwnPropertySymbols(grafastExtensions).map((symbol) => [
        symbol.description,
        grafastExtensions[symbol].length,
      ])
    );
    expect(cacheLengths).toMatchObject({ queryCache: 2, cacheByOperation: 2 });
  });

  it('rejects invalid limits before Graphile schema construction', () => {
    expect(() =>
      createGrafastCacheLimitsPreset({ operationsCacheMaxLength: 1 })
    ).toThrow(
      'graphile.grafastCache.operationsCacheMaxLength must be a safe integer of at least 2'
    );
  });
});
