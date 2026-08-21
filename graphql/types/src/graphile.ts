import type { GraphileConfig } from 'graphile-config';

export type GraphileIntrospectionMode = 'stock' | 'scoped-required';
export type GraphileIntrospectionClientReleaseMode = 'reuse' | 'destroy';
export type GraphileRealtimeNotificationMode = 'dedicated' | 'shared-exact';

/** Per-schema Grafast parse, operation, and plan cache bounds. */
export interface GrafastCacheLimits {
  /** Maximum parsed and validated GraphQL documents retained by one schema. */
  queryCacheMaxLength?: number;
  /** Maximum GraphQL operations with retained plan lookup state per schema. */
  operationsCacheMaxLength?: number;
  /** Maximum context/variable-specific plans retained for one operation. */
  operationOperationPlansCacheMaxLength?: number;
}

/**
 * PostGraphile/Graphile v5 configuration
 */
export interface GraphileOptions {
  /** Database schema(s) to expose through GraphQL */
  schema?: string | string[];
  /**
   * Additional trusted startup presets, applied after Constructive's feature
   * preset. The server rejects nested attempts to replace its pgServices,
   * tenant request context, transport/error policy, or fixed runtime plugins.
   */
  extends?: GraphileConfig.Preset[];
  /**
   * Trusted startup preset overrides. Safe schema and runtime settings plus
   * caller plugins are applied; Constructive-owned tenant boundaries remain
   * authoritative and fail closed on explicit override attempts.
   */
  preset?: Partial<GraphileConfig.Preset>;
  /**
   * Admit `extends` and `preset` as fully trusted in-process code in production.
   *
   * Graphile plugins are not sandboxed: an admitted plugin can execute raw SQL
   * through the configured PostgreSQL service and can access the Node.js
   * process. Production therefore rejects every non-empty caller preset unless
   * the deployment explicitly opts it into the server trust boundary.
   */
  trustCallerPresetsInProduction?: boolean;
  /** PostgreSQL catalog introspection strategy; scoped mode fails if any requested schema is absent */
  introspectionMode?: GraphileIntrospectionMode;
  /**
   * Whether the exact PostgreSQL client used for catalog introspection is
   * returned to the runtime pool or destroyed after the gather query. Destroy
   * avoids carrying catalog-query backend memory into request traffic and
   * costs one lazy reconnect after each schema build.
   */
  introspectionClientReleaseMode?: GraphileIntrospectionClientReleaseMode;
  /**
   * Ordered, non-writable schemas that exposed objects may depend on (for
   * example the schema containing PostGIS or pgvector). Scoped mode fails if
   * catalog closure reaches any other non-system schema.
   */
  introspectionDependencySchemas?: string[];
  /** Explicit per-schema Grafast cache bounds used for tenant-density control. */
  grafastCache?: GrafastCacheLimits;
  /**
   * Release schema-construction-only Graphile state after successful schema
   * validation. This is an opt-in density optimization; materialized schemas
   * and runtime execution state remain tenant-dedicated.
   */
  releaseBuildStateAfterValidation?: boolean;
  /**
   * Exact physical schema containing realtime cursor functions. Omit for the
   * compatibility default `realtime_public`.
   */
  realtimeSchema?: string;
  /**
   * PostgreSQL notification transport. `dedicated` preserves the current
   * per-Graphile PgSubscriber; `shared-exact` is an experimental, default-off,
   * role-attested broker whose leases are restricted to compiled physical
   * topics. The GraphQL server routes WebSocket upgrades independently through
   * the exact tenant build contract and admission boundary.
   */
  realtimeNotificationMode?: GraphileRealtimeNotificationMode;
  /** Maximum age of a successful shared-listener role attestation. */
  realtimeNotificationRoleRevalidationMs?: number;
  /** Cursor recovery poll interval; lower values trade database QPS for latency. */
  realtimeCursorPollIntervalMs?: number;
  /** Cursor listener heartbeat interval. */
  realtimeCursorHeartbeatIntervalMs?: number;
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
   * Allow the authenticated X-Meta-Schema private-header surface. This is a
   * privileged, potentially cross-tenant control-plane API and is disabled by
   * default; it must never share a tenant-facing ingress.
   */
  allowMetaSchemaHeader?: boolean;
  /**
   * Schema containing the compiled resolve_route() resolver. Requests are
   * always resolved through the scoped-routing plane via
   * <schema>.resolve_route() (host → tenant/api/db/role).
   */
  routingSchema?: string;
  /**
   * Process secret that authenticates reserved internal routing, identity, and
   * cache-administration headers. It must contain at least 32 bytes. When it
   * is absent, those headers are rejected rather than trusted from the network.
   */
  internalRequestSecret?: string;
}

/**
 * Default GraphQL/Graphile configuration values
 */
export const graphileDefaults: GraphileOptions = {
  schema: [],
  extends: [],
  preset: {},
  trustCallerPresetsInProduction: false,
  introspectionMode: 'stock',
  introspectionClientReleaseMode: 'reuse',
  introspectionDependencySchemas: [],
  releaseBuildStateAfterValidation: false,
  realtimeNotificationMode: 'dedicated',
  realtimeNotificationRoleRevalidationMs: 60_000,
  realtimeCursorPollIntervalMs: 5_000,
  realtimeCursorHeartbeatIntervalMs: 30_000
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
  anonRole: 'administrator',
  roleName: 'administrator',
  isPublic: true,
  metaSchemas: [
    'routing_public',
    'metaschema_public',
    'metaschema_modules_public'
  ],
  allowMetaSchemaHeader: false,
  routingSchema: 'routing_public'
};
