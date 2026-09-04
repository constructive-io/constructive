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
