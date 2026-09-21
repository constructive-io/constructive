import 'graphile-build';

import type {
  PgScopedIntrospectionConfig,
  PgScopedIntrospectionServiceConfig,
  SchemaScopedIntrospectionOptions,
} from '@constructive-io/graphql-types';
import { withPgClientFromPgService } from '@dataplan/pg';
import {
  PgIntrospectionPlugin,
  version as graphileBuildPgVersion,
} from 'graphile-build-pg';
import type { GraphileConfig } from 'graphile-config';
import type { Introspection } from 'pg-introspection';
import {
  makeIntrospectionQuery,
  parseIntrospectionResults,
} from 'pg-introspection';

import {
  makeSchemaScopedIntrospectionPlan,
  type SchemaScopedIntrospectionPlan,
  validateSchemaScopedIntrospection,
} from './scoped-introspection-query';

export type {
  PgScopedIntrospectionConfig,
  PgScopedIntrospectionServiceConfig,
  SchemaScopedIntrospectionOptions,
  ScopedCatalogTypes,
} from '@constructive-io/graphql-types';

type GatherInfo = {
  cache: {
    introspectionResultsPromise: Promise<RawIntrospection[]> | null;
    dirty: boolean;
  };
  state: {
    getIntrospectionPromise:
      Promise<IntrospectionResult[]> | IntrospectionResult[] | null;
  };
  options: GraphileBuild.GatherOptions;
  resolvedPreset: GraphileConfig.ResolvedPreset;
  process(eventName: string, event: Record<string, unknown>): Promise<unknown>;
};
type IntrospectionResult = {
  pgService: GraphileConfig.PgServiceConfiguration;
  introspection: Introspection;
};
type RawIntrospection = {
  pgService: GraphileConfig.PgServiceConfiguration;
  introspectionText: string;
  scopedPlan: SchemaScopedIntrospectionPlan | null;
};
type PgQuery = { text: string; values?: unknown[] };

const upstreamGather = PgIntrospectionPlugin.gather;
const upstreamHelpers = upstreamGather?.helpers as
  Record<string, unknown> | undefined;
const upstreamGetIntrospection = upstreamHelpers?.getIntrospection as
  ((info: never) => unknown) | undefined;
const SUPPORTED_GRAPHILE_BUILD_PG_VERSION = '5.1.3';

if (graphileBuildPgVersion !== SUPPORTED_GRAPHILE_BUILD_PG_VERSION) {
  throw new Error(
    `Unsupported graphile-build-pg introspection contract: expected ${SUPPORTED_GRAPHILE_BUILD_PG_VERSION}, received ${graphileBuildPgVersion}`
  );
}

if (!upstreamGather || !upstreamHelpers || !upstreamGetIntrospection) {
  throw new Error(
    'graphile-build-pg PgIntrospectionPlugin no longer exposes the expected gather contract'
  );
}

function getIntrospectionQuery(
  pgService: GraphileConfig.PgServiceConfiguration,
  config?: PgScopedIntrospectionServiceConfig
): {
  query: PgQuery;
  scopedPlan: SchemaScopedIntrospectionPlan | null;
} {
  if (config === undefined || config === false) {
    return {
      query: { text: makeIntrospectionQuery() },
      scopedPlan: null,
    };
  }

  const options: SchemaScopedIntrospectionOptions =
    config === true ? {} : config;
  const scopedPlan = makeSchemaScopedIntrospectionPlan(
    pgService.schemas ?? [],
    options
  );
  return {
    query: scopedPlan.query,
    scopedPlan,
  };
}

function assertScopedIntrospectionServices(
  pgServices: readonly GraphileConfig.PgServiceConfiguration[] | undefined,
  options: PgScopedIntrospectionConfig | undefined
): void {
  if (options === undefined) return;
  if (
    options === null ||
    typeof options !== 'object' ||
    Array.isArray(options)
  ) {
    throw new Error(
      'pgScopedIntrospection must be an object keyed by PostgreSQL service name'
    );
  }

  const serviceNames = new Set(
    (pgServices ?? []).map((pgService) => pgService.name)
  );
  const unknownServiceNames = Object.keys(options).filter(
    (serviceName) => !serviceNames.has(serviceName)
  );
  if (unknownServiceNames.length > 0) {
    throw new Error(
      `Schema-scoped introspection configured for unknown PostgreSQL service(s): ${unknownServiceNames.join(', ')}`
    );
  }

  for (const [serviceName, config] of Object.entries(options)) {
    if (
      config !== true &&
      config !== false &&
      (config === null ||
        typeof config !== 'object' ||
        Array.isArray(config))
    ) {
      throw new Error(
        `Schema-scoped introspection configuration for service '${serviceName}' must be true, false, or an options object`
      );
    }
  }
}

// Adapted from graphile-build-pg@5.1.3
// dist/plugins/PgIntrospectionPlugin.js. The upstream function is private, so
// mixed/scoped services must retain this service validation/query seam locally.
async function introspectPgServices(
  pgServices: readonly GraphileConfig.PgServiceConfiguration[] | undefined,
  scopedIntrospection: PgScopedIntrospectionConfig | undefined
): Promise<RawIntrospection[]> {
  assertScopedIntrospectionServices(pgServices, scopedIntrospection);
  if (!pgServices) return [];

  const seenNames = new Map<string, number>();
  const seenPgSettingsKeys = new Map<string, number>();
  const seenWithPgClientKeys = new Map<string, number>();

  return Promise.all(
    pgServices.map(async (pgService, i) => {
      const { name, pgSettingsKey, withPgClientKey } = pgService;
      if (!name) throw new Error(`pgServices[${i}] has no name`);
      if (!withPgClientKey) {
        throw new Error(`pgServices[${i}] has no withPgClientKey`);
      }
      const duplicateName = seenNames.get(name);
      if (duplicateName !== undefined) {
        throw new Error(
          `pgServices[${i}] has the same name as pgServices[${duplicateName}] (${JSON.stringify(name)})`
        );
      }
      seenNames.set(name, i);
      const duplicateClientKey = seenWithPgClientKeys.get(withPgClientKey);
      if (duplicateClientKey !== undefined) {
        throw new Error(
          `pgServices[${i}] has the same withPgClientKey as pgServices[${duplicateClientKey}] (${JSON.stringify(withPgClientKey)})`
        );
      }
      seenWithPgClientKeys.set(withPgClientKey, i);
      if (pgSettingsKey) {
        const duplicateSettingsKey = seenPgSettingsKeys.get(pgSettingsKey);
        if (duplicateSettingsKey !== undefined) {
          throw new Error(
            `pgServices[${i}] has the same pgSettingsKey as pgServices[${duplicateSettingsKey}] (${JSON.stringify(pgSettingsKey)})`
          );
        }
        seenPgSettingsKeys.set(pgSettingsKey, i);
      }

      const { query, scopedPlan } = getIntrospectionQuery(
        pgService,
        scopedIntrospection?.[name]
      );
      const result = await withPgClientFromPgService(
        pgService,
        pgService.pgSettingsForIntrospection ?? null,
        (client) => client.query<{ introspection: string }>(query)
      );
      const [row] = result.rows;
      if (!row) throw new Error('Introspection failed');
      return {
        pgService,
        introspectionText: row.introspection,
        scopedPlan,
      };
    })
  );
}

async function announceIntrospection(
  info: GatherInfo,
  introspections: IntrospectionResult[]
): Promise<void> {
  await Promise.all(
    introspections.map(async ({ introspection, pgService }) => {
      const announce = async (
        eventName: string,
        entities: readonly unknown[]
      ): Promise<void> => {
        await Promise.all(
          entities.map((entity) =>
            info.process(eventName, { entity, serviceName: pgService.name })
          )
        );
      };

      await info.process('pgIntrospection_introspection', {
        introspection,
        serviceName: pgService.name,
      });
      await announce('pgIntrospection_namespace', introspection.namespaces);
      await announce('pgIntrospection_class', introspection.classes);
      await announce('pgIntrospection_attribute', introspection.attributes);
      await announce('pgIntrospection_constraint', introspection.constraints);
      await announce('pgIntrospection_proc', introspection.procs);
      await announce('pgIntrospection_role', introspection.roles);
      await announce('pgIntrospection_auth_member', introspection.auth_members);
      await announce('pgIntrospection_type', introspection.types);
      await announce('pgIntrospection_enum', introspection.enums);
      await announce('pgIntrospection_extension', introspection.extensions);
      await announce('pgIntrospection_index', introspection.indexes);
      await announce('pgIntrospection_language', introspection.languages);
      await announce('pgIntrospection_range', introspection.ranges);
      await announce('pgIntrospection_depend', introspection.depends);
      await announce('pgIntrospection_description', introspection.descriptions);
    })
  );
}

// Adapted from graphile-build-pg@5.1.3
// dist/plugins/PgIntrospectionPlugin.js. Upstream does not expose its
// cache/parse/announcement flow independently from the stock query.
function getConstructiveIntrospection(
  info: GatherInfo
): Promise<IntrospectionResult[]> | IntrospectionResult[] {
  const pgServices: readonly GraphileConfig.PgServiceConfiguration[] =
    info.resolvedPreset.pgServices ?? [];
  const scopedIntrospection = info.options.pgScopedIntrospection;
  assertScopedIntrospectionServices(pgServices, scopedIntrospection);
  const hasScopedService = Object.values(scopedIntrospection ?? {}).some(
    (config) => config === true || (config !== false && config !== undefined)
  );
  if (!hasScopedService) {
    return upstreamGetIntrospection(info as never) as
      Promise<IntrospectionResult[]> | IntrospectionResult[];
  }

  return (
    info.state.getIntrospectionPromise ??
    (info.state.getIntrospectionPromise = (async () => {
      if (info.cache.dirty) {
        info.cache.introspectionResultsPromise = null;
        info.cache.dirty = false;
      }
      const introspectionPromise =
        info.cache.introspectionResultsPromise ??
        (info.cache.introspectionResultsPromise =
          introspectPgServices(pgServices, scopedIntrospection));
      introspectionPromise.then(null, () => {
        info.cache.introspectionResultsPromise = null;
      });

      const rawIntrospections = await introspectionPromise;
      // Keep the raw result promise for clean gathers. Parsed introspection is
      // intentionally rebuilt because gather plugins may mutate their copy.
      const introspections = rawIntrospections.map(
        ({ pgService, introspectionText, scopedPlan }) => {
          const introspection = parseIntrospectionResults(introspectionText);
          if (scopedPlan) {
            try {
              validateSchemaScopedIntrospection(introspection, scopedPlan);
            } catch (error) {
              const message =
                error instanceof Error ? error.message : String(error);
              throw new Error(
                `Schema-scoped introspection validation failed for PostgreSQL service '${pgService.name}': ${message}`,
                { cause: error }
              );
            }
          }
          return { pgService, introspection };
        }
      );

      // Announcements may call back into getIntrospection, so expose the
      // resolved gather-local value before broadcasting entities.
      info.state.getIntrospectionPromise = introspections;
      await announceIntrospection(info, introspections);
      return introspections;
    })())
  );
}

async function getRangeByType(
  info: GatherInfo & {
    helpers: GraphileConfig.GatherHelpers;
  },
  serviceName: string,
  typeId: string
) {
  const introspections = await info.helpers.pgIntrospection.getIntrospection();
  const relevant = introspections.find(
    (result) => result.pgService.name === serviceName
  );
  if (!relevant) throw new Error(`Could not find database '${serviceName}'`);
  return relevant.introspection.ranges.find(
    (range) => range.rngtypid === typeId || range.rngmultitypid === typeId
  );
}

/**
 * CNC-owned atomic replacement for graphile-build-pg's introspection plugin.
 * Stock-only configurations delegate to the upstream helper unchanged.
 */
export const ConstructivePgIntrospectionPlugin: GraphileConfig.Plugin = {
  name: 'ConstructivePgIntrospectionPlugin',
  description:
    'Adds opt-in schema-scoped PostgreSQL introspection for Constructive',
  version: PgIntrospectionPlugin.version,
  provides: ['PgIntrospectionPlugin'],
  before: ['PgRegistryPlugin'],
  gather: {
    ...upstreamGather,
    helpers: {
      ...upstreamHelpers,
      getIntrospection: getConstructiveIntrospection,
      getRangeByType,
    },
  } as never,
};

/** Disable upstream atomically before installing the CNC replacement. */
export const ScopedIntrospectionPreset: GraphileConfig.Preset = {
  disablePlugins: ['PgIntrospectionPlugin'],
  plugins: [ConstructivePgIntrospectionPlugin],
};

export const scopedIntrospectionUpstreamContract = Object.freeze({
  package: 'graphile-build-pg',
  version: SUPPORTED_GRAPHILE_BUILD_PG_VERSION,
  pluginName: PgIntrospectionPlugin.name,
  namespace: upstreamGather.namespace,
  hasInitialCache: typeof upstreamGather.initialCache === 'function',
  hasInitialState: typeof upstreamGather.initialState === 'function',
  hasWatch: typeof upstreamGather.watch === 'function',
  helperNames: Object.keys(upstreamHelpers).sort(),
  hookNames: Object.keys(upstreamGather.hooks ?? {}).sort(),
});
