import type { GraphileConfig } from 'graphile-config';

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
   * Schema containing the compiled resolve_route() resolver. Requests are
   * always resolved through the scoped-routing plane via
   * <schema>.resolve_route() (host → tenant/api/db/role).
   */
  routingSchema?: string;
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
  anonRole: 'administrator',
  roleName: 'administrator',
  isPublic: true,
  metaSchemas: [
    'routing_public',
    'metaschema_public',
    'metaschema_modules_public'
  ],
  routingSchema: 'routing_public'
};
