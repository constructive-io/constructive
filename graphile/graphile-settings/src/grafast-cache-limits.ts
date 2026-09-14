import { normalizeGrafastCacheLimits } from '@constructive-io/graphql-env';
import type { GrafastCacheLimits } from '@constructive-io/graphql-types';
import type { GraphileConfig } from 'graphile-config';
import type { GraphQLSchemaConfig } from 'graphql';

/** Apply authoritative per-schema cache limits without disturbing extensions. */
export const applyGrafastCacheLimits = (
  config: GraphQLSchemaConfig,
  limits: Readonly<GrafastCacheLimits>
): GraphQLSchemaConfig => ({
  ...config,
  extensions: {
    ...(config.extensions ?? {}),
    grafast: {
      ...(config.extensions?.grafast ?? {}),
      ...limits,
    },
  },
});

/** Reusable plugin for bounding Grafast's schema-local runtime caches. */
export const createGrafastCacheLimitsPlugin = (
  limits: GrafastCacheLimits
): GraphileConfig.Plugin => {
  const normalized = normalizeGrafastCacheLimits(limits) ?? {};
  return {
    name: 'GrafastCacheLimitsPlugin',
    version: '1.0.0',
    description: 'Bounds schema-local Grafast parse and operation-plan caches',
    schema: {
      hooks: {
        GraphQLSchema(config) {
          return applyGrafastCacheLimits(config, normalized);
        },
      },
    },
  };
};

export const createGrafastCacheLimitsPreset = (
  limits?: GrafastCacheLimits
): GraphileConfig.Preset => {
  const normalized = normalizeGrafastCacheLimits(limits);
  return normalized === undefined || Object.keys(normalized).length === 0
    ? {}
    : { plugins: [createGrafastCacheLimitsPlugin(normalized)] };
};
