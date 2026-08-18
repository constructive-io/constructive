import type { GraphileConfig } from 'graphile-config';

export const graphileIntrospectionModes = ['stock', 'scoped-required'] as const;

export type GraphileIntrospectionMode =
  (typeof graphileIntrospectionModes)[number];

export type ScopedCatalogTypes = 'all' | 'dependency-closure';

export interface ScopedIntrospectionServiceOptions {
  /** Selects the catalog query used during this service's gather phase. */
  introspectionMode?: GraphileIntrospectionMode;
  /** Catalog types retained by scoped introspection; defaults to all. */
  introspectionScopedCatalogTypes?: ScopedCatalogTypes;
  /** Non-root schemas that scoped dependency closure may retain. */
  introspectionAllowedDependencySchemas?: readonly string[];
  /** Installed extensions whose optional capability metadata is required. */
  introspectionCapabilityExtensions?: readonly string[];
}

/**
 * PostGraphile/Graphile v5 configuration
 */
export interface GraphileOptions {
  /** Database schema(s) to expose through GraphQL */
  schema?: string | string[];
  /** PostgreSQL catalog introspection implementation selected at startup. */
  introspectionMode?: GraphileIntrospectionMode;
  /** Additional schemas that scoped dependency closure may retain. */
  introspectionDependencySchemas?: string[];
  /** Installed extensions whose optional capability metadata must be retained. */
  introspectionCapabilityExtensions?: string[];
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
  introspectionMode: 'stock',
  introspectionDependencySchemas: [],
  introspectionCapabilityExtensions: [],
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
