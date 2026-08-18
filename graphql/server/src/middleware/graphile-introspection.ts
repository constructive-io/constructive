import type { GraphileOptions } from '@constructive-io/graphql-types';
import type { GraphileConfig } from 'graphile-config';
import { makePgService, makeScopedPgService } from 'graphile-settings';
import type { Pool } from 'pg';

export interface IntrospectionWiring {
  presets: GraphileConfig.Preset[];
  pgService: GraphileConfig.PgServiceConfiguration;
}

export type ScopedIntrospectionPresetLoader =
  () => Promise<GraphileConfig.Preset>;

let scopedIntrospectionPresetPromise:
  Promise<GraphileConfig.Preset> | undefined;

const loadScopedIntrospectionPreset = (): Promise<GraphileConfig.Preset> => {
  scopedIntrospectionPresetPromise ??=
    import('graphile-scoped-introspection').then(
      ({ ScopedIntrospectionPreset }) => ScopedIntrospectionPreset
    );
  return scopedIntrospectionPresetPromise;
};

/**
 * Select the stock or scoped introspection wiring once, while constructing a
 * server-owned schema handler. The stock branch returns before the scoped
 * package (and its upstream contract sentinel) is loaded.
 */
export const makeIntrospectionWiring = async (
  pool: Pool,
  schemas: string[],
  graphileOptions: GraphileOptions | undefined,
  loadScopedPreset: ScopedIntrospectionPresetLoader = loadScopedIntrospectionPreset
): Promise<IntrospectionWiring> => {
  const scopedIntrospection = graphileOptions?.scopedIntrospection;
  if (
    scopedIntrospection !== undefined &&
    typeof scopedIntrospection !== 'boolean'
  ) {
    throw new Error('graphile.scopedIntrospection must be a boolean');
  }

  if (scopedIntrospection !== true) {
    const configuredScopedOptions = [
      (graphileOptions?.introspectionDependencySchemas?.length ?? 0) > 0
        ? 'introspectionDependencySchemas'
        : null,
      (graphileOptions?.introspectionCapabilityExtensions?.length ?? 0) > 0
        ? 'introspectionCapabilityExtensions'
        : null,
    ].filter((option): option is string => option !== null);
    if (configuredScopedOptions.length > 0) {
      throw new Error(
        `Graphile scoped introspection option(s) ${configuredScopedOptions.join(
          ', '
        )} require scopedIntrospection: true`
      );
    }
    return {
      presets: [],
      pgService: makePgService({ pool, schemas }),
    };
  }

  const scopedPreset = await loadScopedPreset();
  return {
    presets: [scopedPreset],
    pgService: makeScopedPgService({
      pool,
      schemas,
      introspectionScopedCatalogTypes: 'dependency-closure',
      introspectionAllowedDependencySchemas:
        graphileOptions?.introspectionDependencySchemas,
      introspectionCapabilityExtensions:
        graphileOptions?.introspectionCapabilityExtensions,
    }),
  };
};
