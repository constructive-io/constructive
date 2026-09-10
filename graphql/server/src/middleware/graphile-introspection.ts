import type { GraphileOptions } from '@constructive-io/graphql-types';
import { type GraphileConfig,resolvePreset } from 'graphile-config';
import { makePgService } from 'graphile-settings';
import type { Pool } from 'pg';

export interface IntrospectionWiring {
  presets: GraphileConfig.Preset[];
  pgService: GraphileConfig.PgServiceConfiguration;
}

export type ScopedIntrospectionPresetLoader =
  () => Promise<GraphileConfig.Preset>;

const SCOPED_INTROSPECTION_PLUGIN = 'ConstructivePgIntrospectionPlugin';

let scopedIntrospectionPresetPromise:
  Promise<GraphileConfig.Preset> | undefined;

const loadScopedIntrospectionPreset = (): Promise<GraphileConfig.Preset> => {
  scopedIntrospectionPresetPromise ??=
    import('graphile-scoped-introspection').then(
      ({ ScopedIntrospectionPreset }) => ScopedIntrospectionPreset
    );
  return scopedIntrospectionPresetPromise;
};

type ResolvedCallerPreset = GraphileConfig.ResolvedPreset | undefined;

/**
 * Resolve caller-provided Graphile configuration before deciding whether the
 * optional scoped introspection package is needed. Graphile config applies
 * nested `extends` entries before the containing preset, so this preserves the
 * same precedence used by the eventual schema build.
 */
export const resolveCallerPreset = (
  graphileOptions: GraphileOptions | undefined
): ResolvedCallerPreset => {
  const preset = graphileOptions?.preset;
  const presets: GraphileConfig.Preset[] = [
    ...(graphileOptions?.extends ?? []),
    ...(preset ? [preset as GraphileConfig.Preset] : [])
  ];
  return presets.length > 0 ? resolvePreset({ extends: presets }) : undefined;
};

const hasLocalScopedIntrospectionPreset = (
  preset: ResolvedCallerPreset
): boolean =>
  preset?.plugins.some((plugin) => plugin.name === SCOPED_INTROSPECTION_PLUGIN) ??
  false;

const hasUpstreamIntrospectionDisabled = (
  preset: ResolvedCallerPreset
): boolean =>
  preset?.disablePlugins.includes('PgIntrospectionPlugin') ?? false;

/**
 * Select the stock or scoped introspection wiring once, while constructing a
 * server-owned schema handler. The stock branch returns before the scoped
 * package (and its upstream contract sentinel) is loaded.
 */
export const makeIntrospectionWiring = async (
  pool: Pool,
  schemas: string[],
  graphileOptions: GraphileOptions | undefined,
  loadScopedPreset: ScopedIntrospectionPresetLoader = loadScopedIntrospectionPreset,
  introspectionRole?: string
): Promise<IntrospectionWiring> => {
  const pgSettingsForIntrospection = introspectionRole ? { role: introspectionRole } : undefined;
  const pgService = makePgService({ pool, schemas, pgSettingsForIntrospection });
  const callerPreset = resolveCallerPreset(graphileOptions);
  const scopedConfig = callerPreset?.gather?.pgScopedIntrospection;
  const hasScopedConfiguration = scopedConfig !== undefined;

  // An explicitly supplied local preset already installs the replacement
  // plugin. Keep that path synchronous and avoid importing the optional
  // package a second time. A raw plugin entry may omit the stock plugin's
  // disablement, so add that narrow preset to keep the replacement atomic.
  if (hasLocalScopedIntrospectionPreset(callerPreset)) {
    return {
      presets: hasUpstreamIntrospectionDisabled(callerPreset)
        ? []
        : [{ disablePlugins: ['PgIntrospectionPlugin'] }],
      pgService
    };
  }

  if (!hasScopedConfiguration) {
    return {
      presets: [],
      pgService
    };
  }

  // Load the replacement whenever the map is supplied, including an empty map,
  // entries set to false, or entries keyed by an unknown service. The
  // replacement owns validation; leaving it out would cause Graphile's stock
  // plugin to silently ignore the gather option in those cases.
  const scopedPreset = await loadScopedPreset();
  return {
    presets: [scopedPreset],
    pgService
  };
};
