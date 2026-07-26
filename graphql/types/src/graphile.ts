import type { GraphileConfig } from 'graphile-config';

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
  /**
   * Explicit tenant database id for static single-tenant mode. There is no
   * default database and this is never populated from env; a request that
   * resolves without a database id is rejected.
   */
  databaseId?: string;
  /** Whether the API is publicly accessible */
  isPublic?: boolean;
  /** Schemas containing metadata tables */
  metaSchemas?: string[];
  /**
   * Resolve incoming requests through the scoped-routing plane via
   * <schema>.resolve_route() (host → tenant/api/db/role). This is the sole
   * host-routing path. When disabled the server runs in static single-tenant
   * mode and exposes `exposedSchemas` directly with no route resolution.
   */
  enableScopedRouting?: boolean;
  /** Schema containing the compiled resolve_route() resolver */
  scopedRoutingSchema?: string;
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
    'constructive_routing_public',
    'metaschema_public',
    'metaschema_modules_public'
  ],
  enableScopedRouting: true,
  scopedRoutingSchema: 'constructive_routing_public'
};
