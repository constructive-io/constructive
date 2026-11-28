import type { GraphileConfig } from 'graphile-config';

export type ScopedCatalogTypes = 'all' | 'dependency-closure';

/** Options for schema-scoped PostgreSQL catalog introspection. */
export interface SchemaScopedIntrospectionOptions {
  /** Retain all catalog types, or only the transitive dependency closure. */
  catalogTypes?: ScopedCatalogTypes;
  /** Extensions whose optional capability metadata should be retained. */
  capabilityExtensions?: readonly string[];
}

/** Per-service schema-scoped introspection configuration. */
export type PgScopedIntrospectionServiceConfig =
  | boolean
  | SchemaScopedIntrospectionOptions;

/** Schema-scoped introspection configuration keyed by PostgreSQL service name. */
export type PgScopedIntrospectionConfig = Readonly<
  Record<string, PgScopedIntrospectionServiceConfig>
>;

declare global {
  namespace GraphileBuild {
    interface GatherOptions {
      /**
       * Schema-scoped introspection options keyed by PostgreSQL service name.
       * `true` enables defaults, `false` keeps stock introspection, and an
       * object customizes the scoped query. Services without an entry keep
       * stock introspection.
       */
      pgScopedIntrospection?: PgScopedIntrospectionConfig;
    }
  }

  // Keep the public preset type usable by graphql-types consumers that do not
  // import graphile-build themselves. graphile-build declares the same field,
  // so this merges with its richer preset declaration when it is present.
  namespace GraphileConfig {
    interface Preset {
      gather?: GraphileBuild.GatherOptions;
    }
  }
}

/** Per-schema Grafast parse, operation, and operation-plan cache bounds. */
export interface GrafastCacheLimits {
  /** Maximum parsed and validated GraphQL documents retained by one schema. */
  queryCacheMaxLength?: number;
  /** Maximum GraphQL operations with retained plan lookup state per schema. */
  operationsCacheMaxLength?: number;
  /** Maximum context/variable-specific plans retained for one operation. */
  operationOperationPlansCacheMaxLength?: number;
}

/**
 * Process-wide bounds on cold PostGraphile handler builds.
 *
 * A build introspects the database and constructs a schema. When many APIs go
 * cold at once (a restart, a flush, more active APIs than the handler cache
 * holds), unbounded builds run in parallel and compete with requests for the
 * same small connection pool until connection attempts time out. Builds beyond
 * `concurrency` wait in arrival order; a build that finds the queue full, or
 * waits longer than `queueWaitMs`, is refused with a retryable 503.
 */
export interface GraphileBuildLimits {
  /** Handler builds that may run at once in this process. */
  concurrency?: number;
  /** Builds that may wait for a slot. `0` refuses at once while every slot is busy. */
  queueMax?: number;
  /** How long a build may wait for a slot, in milliseconds. `0` never waits. */
  queueWaitMs?: number;
}

/**
 * Default build bounds. Two concurrent builds leave most of the default
 * five-connection pool to requests, the queue absorbs a cold start of a few
 * dozen APIs, and a build that cannot start within 30 seconds is refused with
 * a retryable 503 instead of waiting out the client's timeout.
 */
export const graphileBuildLimitDefaults: Readonly<Required<GraphileBuildLimits>> = Object.freeze({
  concurrency: 2,
  queueMax: 64,
  queueWaitMs: 30_000
});

/**
 * PostGraphile/Graphile v5 configuration
 */
export interface GraphileOptions {
  /** Database schema(s) to expose through GraphQL */
  schema?: string | string[];
  /** Additional presets to extend */
  extends?: GraphileConfig.Preset[];
  /** Preset overrides */
  preset?: Partial<GraphileConfig.Preset>;
  /** Explicit per-schema Grafast cache bounds used for tenant-density control. */
  grafastCache?: GrafastCacheLimits;
  /**
   * Bounds on concurrent cold handler builds; see {@link GraphileBuildLimits}.
   * Unset keys use {@link graphileBuildLimitDefaults}.
   */
  buildLimits?: GraphileBuildLimits;
  /**
   * Allow clients to request Grafast plan/SQL output with the
   * `x-graphql-explain` header. Off unless set.
   */
  explain?: boolean;
  /**
   * Serve the GraphiQL UI at `/graphiql` and its static assets at `/ruru-static/`.
   * Defaults to `false` when `NODE_ENV=production` and `true` otherwise.
   */
  graphiql?: boolean;
}

/**
 * Feature flags and toggles for GraphQL/Graphile
 */
export interface GraphileFeatureOptions {
  /** Use simple inflection for GraphQL field names */
  simpleInflection?: boolean;
  /** Use opposite base names for relationships */
  oppositeBaseNames?: boolean;
  /** Enable PostGIS spatial database support */
  postgis?: boolean;
}

/**
 * Configuration options for the Constructive API
 */
export interface ApiOptions {
  /** Database schemas to expose through the API */
  exposedSchemas?: string[];
  /** Anonymous role name for unauthenticated requests */
  anonRole?: string;
  /** Default role name for authenticated requests */
  roleName?: string;
  /** Whether the API is publicly accessible */
  isPublic?: boolean;
  /** Schemas containing metadata tables */
  metaSchemas?: string[];
  /**
   * Shared secret required by the `/flush` cache-invalidation route, presented
   * as `Authorization: Bearer <token>`. The route is disabled when unset.
   */
  flushToken?: string;
  /**
   * Role PostGraphile introspects the database as. Introspection runs outside
   * any request, so it has no served role to inherit; without this it runs as
   * the pool's connecting role and the schema advertises that role's reach
   * rather than the served role's grants.
   *
   * Opt-in, and unset by default: introspection grants decide the *shape* of
   * the schema, so a role with fewer grants than the connecting role silently
   * drops fields. On a platform database `administrator` is missing UPDATE on
   * three `metaschema_public` columns and loses their patch fields, so naming a
   * role is only safe once its grants cover the served surface.
   */
  introspectionRole?: string;
}

/**
 * Default GraphQL/Graphile configuration values
 */
export const graphileDefaults: GraphileOptions = {
  schema: [],
  extends: [],
  preset: {}
};

/**
 * Default feature options for GraphQL/Graphile
 */
export const graphileFeatureDefaults: GraphileFeatureOptions = {
  simpleInflection: true,
  oppositeBaseNames: true,
  postgis: true
};

/**
 * Default API configuration values
 */
export const apiDefaults: ApiOptions = {
  exposedSchemas: [],
  anonRole: 'anonymous',
  roleName: 'authenticated',
  isPublic: true,
  metaSchemas: [
    'routing_public',
    'metaschema_public',
    'metaschema_modules_public'
  ]
};
