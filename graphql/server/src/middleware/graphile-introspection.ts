import type {
  GraphileIntrospectionMode,
  GraphileOptions,
} from '@constructive-io/graphql-types';
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

const assertNever = (mode: never): never => {
  throw new Error(`Unsupported Graphile introspection mode '${String(mode)}'`);
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
  const mode: GraphileIntrospectionMode =
    graphileOptions?.introspectionMode ?? 'stock';

  if (mode === 'stock') {
    return {
      presets: [],
      pgService: makePgService({ pool, schemas }),
    };
  }

  if (mode === 'scoped-required') {
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
  }

  return assertNever(mode);
};
