import 'graphile-build';

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
  makeSchemaScopedIntrospectionQuery,
  type ScopedCatalogTypes,
} from './scoped-introspection-query';

export type GraphileIntrospectionMode = 'stock' | 'scoped-required';

export interface ScopedIntrospectionServiceOptions {
  introspectionMode?: GraphileIntrospectionMode;
  introspectionScopedCatalogTypes?: ScopedCatalogTypes;
  introspectionAllowedDependencySchemas?: readonly string[];
  introspectionCapabilityExtensions?: readonly string[];
}

declare global {
  namespace GraphileConfig {
    interface PgServiceConfiguration {
      /** Selects the catalog query used during this service's gather phase. */
      introspectionMode?: GraphileIntrospectionMode;
      /** Catalog types retained by scoped introspection; defaults to all. */
      introspectionScopedCatalogTypes?: ScopedCatalogTypes;
      /** Non-root schemas that scoped dependency closure may retain. */
      introspectionAllowedDependencySchemas?: readonly string[];
      /** Installed extensions whose optional capability metadata is required. */
      introspectionCapabilityExtensions?: readonly string[];
    }
  }
}

type GatherInfo = {
  cache: {
    introspectionResultsPromise: Promise<RawIntrospection[]> | null;
    dirty: boolean;
  };
  state: {
    getIntrospectionPromise:
      Promise<IntrospectionResult[]> | IntrospectionResult[] | null;
  };
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
  requiredSchemas: readonly string[] | null;
  allowedSchemas: readonly string[] | null;
  scopedCatalogTypes: ScopedCatalogTypes | null;
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

function isScopedService(
  pgService: GraphileConfig.PgServiceConfiguration
): boolean {
  return pgService.introspectionMode === 'scoped-required';
}

function getIntrospectionQuery(
  pgService: GraphileConfig.PgServiceConfiguration
): Omit<RawIntrospection, 'pgService' | 'introspectionText'> & {
  query: PgQuery;
} {
  const mode = pgService.introspectionMode ?? 'stock';
  const configuredCatalogTypes = pgService.introspectionScopedCatalogTypes;
  const configuredCapabilityExtensions =
    pgService.introspectionCapabilityExtensions;
  const scopedCatalogTypes = configuredCatalogTypes ?? 'all';

  if (
    scopedCatalogTypes !== 'all' &&
    scopedCatalogTypes !== 'dependency-closure'
  ) {
    throw new Error(
      `Unsupported scoped catalog type policy '${scopedCatalogTypes}' for service '${pgService.name}'`
    );
  }
  if (mode === 'stock') {
    if (configuredCatalogTypes !== undefined) {
      throw new Error(
        `Scoped catalog type policy is only valid with scoped-required introspection for service '${pgService.name}'`
      );
    }
    if (configuredCapabilityExtensions !== undefined) {
      throw new Error(
        `Scoped extension capabilities are only valid with scoped-required introspection for service '${pgService.name}'`
      );
    }
    return {
      query: { text: makeIntrospectionQuery() },
      requiredSchemas: null,
      allowedSchemas: null,
      scopedCatalogTypes: null,
    };
  }
  if (mode === 'scoped-required') {
    const requiredSchemas = pgService.schemas ?? [];
    const dependencySchemas =
      pgService.introspectionAllowedDependencySchemas ?? [];
    return {
      query: makeSchemaScopedIntrospectionQuery(requiredSchemas, {
        catalogTypes: scopedCatalogTypes,
        capabilityExtensions: configuredCapabilityExtensions ?? [],
      }),
      requiredSchemas,
      allowedSchemas: [
        ...new Set([...requiredSchemas, ...dependencySchemas, 'pg_catalog']),
      ],
      scopedCatalogTypes,
    };
  }
  throw new Error(
    `Unsupported PostgreSQL introspection mode '${mode}' for service '${pgService.name}'`
  );
}

function assertScopedNamespaces(
  introspection: Introspection,
  requiredSchemas: readonly string[] | null,
  allowedSchemas: readonly string[] | null,
  serviceName: string
): void {
  if (requiredSchemas === null || allowedSchemas === null) return;

  const found = new Set(
    introspection.namespaces.map((namespace) => namespace.nspname)
  );
  const missing = requiredSchemas.filter((schema) => !found.has(schema));
  if (missing.length > 0) {
    throw new Error(
      `Schema-scoped introspection for service '${serviceName}' did not find required schema(s): ${missing.join(', ')}`
    );
  }
  const allowed = new Set(allowedSchemas);
  const unexpected = [...found].filter((schema) => !allowed.has(schema));
  if (unexpected.length > 0) {
    throw new Error(
      `Schema-scoped introspection for service '${serviceName}' crossed into unapproved dependency schema(s): ${unexpected.join(', ')}`
    );
  }
}

function assertDependencyClosureTypes(
  introspection: Introspection,
  scopedCatalogTypes: ScopedCatalogTypes | null,
  serviceName: string
): void {
  if (scopedCatalogTypes !== 'dependency-closure') return;

  const retainedTypeOids = new Set(
    introspection.types.map((type) => String(type._id))
  );
  const requireType = (
    oid: unknown,
    objectKind: string,
    objectContext: string,
    field: string
  ): void => {
    if (oid === null || oid === undefined || String(oid) === '0') return;
    const normalizedOid = String(oid);
    // pg-introspection removes extension-owned composite resources from its
    // public arrays after building lookups. Validate the runtime lookup too.
    const introspectionLookups = (
      introspection as Introspection & {
        _lookups?: { typeById?: Map<string, unknown> };
      }
    )._lookups;
    const resolves =
      retainedTypeOids.has(normalizedOid) ||
      introspectionLookups?.typeById?.has(normalizedOid) === true;
    if (!resolves) {
      throw new Error(
        `Dependency-closure introspection for service '${serviceName}' retained ${objectKind} '${objectContext}' field '${field}' referencing missing pg_type OID '${normalizedOid}'`
      );
    }
  };
  const requireTypes = (
    oids: readonly unknown[] | null | undefined,
    objectKind: string,
    objectContext: string,
    field: string
  ): void => {
    for (const oid of oids ?? []) {
      requireType(oid, objectKind, objectContext, field);
    }
  };

  for (const entity of introspection.classes) {
    const context = `${entity.relname} (${entity._id})`;
    requireType(entity.reltype, 'pg_class', context, 'reltype');
    requireType(entity.reloftype, 'pg_class', context, 'reloftype');
  }
  for (const entity of introspection.attributes) {
    requireType(
      entity.atttypid,
      'pg_attribute',
      `${entity.attrelid}.${entity.attname}`,
      'atttypid'
    );
  }
  for (const entity of introspection.constraints) {
    requireType(
      entity.contypid,
      'pg_constraint',
      `${entity.conname} (${entity._id})`,
      'contypid'
    );
  }
  for (const entity of introspection.procs) {
    const context = `${entity.proname} (${entity._id})`;
    requireType(entity.prorettype, 'pg_proc', context, 'prorettype');
    requireTypes(entity.proargtypes, 'pg_proc', context, 'proargtypes');
    requireTypes(entity.proallargtypes, 'pg_proc', context, 'proallargtypes');
  }
  for (const entity of introspection.types) {
    const context = `${entity.typname} (${entity._id})`;
    requireType(entity.typbasetype, 'pg_type', context, 'typbasetype');
    requireType(entity.typelem, 'pg_type', context, 'typelem');
    requireType(entity.typarray, 'pg_type', context, 'typarray');
  }
  for (const entity of introspection.enums) {
    requireType(
      entity.enumtypid,
      'pg_enum',
      `${entity.enumlabel} (${entity._id})`,
      'enumtypid'
    );
  }
  for (const entity of introspection.ranges) {
    const context = `range ${entity.rngtypid ?? 'unknown'}`;
    requireType(entity.rngtypid, 'pg_range', context, 'rngtypid');
    requireType(entity.rngsubtype, 'pg_range', context, 'rngsubtype');
    requireType(entity.rngmultitypid, 'pg_range', context, 'rngmultitypid');
  }
}

// Adapted from graphile-build-pg@5.1.3
// dist/plugins/PgIntrospectionPlugin.js. The upstream function is private, so
// mixed/scoped services must retain this service validation/query seam locally.
async function introspectPgServices(
  pgServices: readonly GraphileConfig.PgServiceConfiguration[] | undefined
): Promise<RawIntrospection[]> {
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

      const { query, requiredSchemas, allowedSchemas, scopedCatalogTypes } =
        getIntrospectionQuery(pgService);
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
        requiredSchemas,
        allowedSchemas,
        scopedCatalogTypes,
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
  if (!pgServices.some(isScopedService)) {
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
          introspectPgServices(pgServices));
      introspectionPromise.then(null, () => {
        info.cache.introspectionResultsPromise = null;
      });

      const rawIntrospections = await introspectionPromise;
      if (info.cache.introspectionResultsPromise === introspectionPromise) {
        info.cache.introspectionResultsPromise = null;
      }
      const introspections = rawIntrospections.map(
        ({
          pgService,
          introspectionText,
          requiredSchemas,
          allowedSchemas,
          scopedCatalogTypes,
        }) => {
          const introspection = parseIntrospectionResults(introspectionText);
          assertScopedNamespaces(
            introspection,
            requiredSchemas,
            allowedSchemas,
            pgService.name
          );
          assertDependencyClosureTypes(
            introspection,
            scopedCatalogTypes,
            pgService.name
          );
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
