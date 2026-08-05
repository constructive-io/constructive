import type { GrafastCacheLimits } from '@constructive-io/graphql-types';
import type { GraphileConfig } from 'graphile-config';
import type { GraphQLSchemaConfig } from 'graphql';

const LIMIT_KEYS = [
  'queryCacheMaxLength',
  'operationsCacheMaxLength',
  'operationOperationPlansCacheMaxLength'
] as const;

/** Validate cache bounds before they reach Grafast's LRU constructors. */
export const normalizeGrafastCacheLimits = (
  limits: GrafastCacheLimits
): Readonly<GrafastCacheLimits> => {
  const normalized: GrafastCacheLimits = {};
  for (const key of LIMIT_KEYS) {
    const value = limits[key];
    if (value === undefined) continue;
    if (!Number.isSafeInteger(value) || value < 2) {
      throw new Error(`grafastCache.${key} must be a safe integer of at least 2`);
    }
    normalized[key] = value;
  }
  return Object.freeze(normalized);
};

/** Apply authoritative per-schema cache limits without disturbing other extensions. */
export const applyGrafastCacheLimits = (
  config: GraphQLSchemaConfig,
  limits: Readonly<GrafastCacheLimits>
): GraphQLSchemaConfig => ({
  ...config,
  extensions: {
    ...(config.extensions ?? {}),
    grafast: {
      ...(config.extensions?.grafast ?? {}),
      ...limits
    }
  }
});

/** Reusable plugin API for bounding Grafast's schema-local memory growth. */
export const createGrafastCacheLimitsPlugin = (
  limits: GrafastCacheLimits
): GraphileConfig.Plugin => {
  const normalized = normalizeGrafastCacheLimits(limits);
  return {
    name: 'GrafastCacheLimitsPlugin',
    version: '1.0.0',
    description: 'Bounds schema-local Grafast parse and operation-plan caches',
    schema: {
      hooks: {
        GraphQLSchema(config) {
          return applyGrafastCacheLimits(config, normalized);
        }
      }
    }
  };
};

export const createGrafastCacheLimitsPreset = (
  limits: GrafastCacheLimits
): GraphileConfig.Preset => {
  const normalized = normalizeGrafastCacheLimits(limits);
  return Object.keys(normalized).length === 0
    ? {}
    : { plugins: [createGrafastCacheLimitsPlugin(normalized)] };
};
