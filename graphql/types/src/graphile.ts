import type { GraphileConfig } from 'graphile-config';

/**
 * WebSocket configuration for GraphQL subscriptions
 */
export interface WebsocketConfig {
  /** Whether websockets are enabled (default: false) */
  enabled?: boolean;
  /** WebSocket path (defaults to graphqlPath if not specified) */
  path?: string;
}

/**
 * Grafserv configuration options
 */
export interface GrafservConfig {
  /** Path for GraphQL endpoint (default: '/graphql') */
  graphqlPath?: string;
  /** Path for GraphiQL IDE (default: '/graphiql') */
  graphiqlPath?: string;
  /** WebSocket configuration */
  websockets?: WebsocketConfig;
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
  /** Grafserv configuration (paths, websockets) */
  grafserv?: GrafservConfig;
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
  /** Whether to enable the services API (domain/subdomain routing via services_public) */
  enableServicesApi?: boolean;
  /** Database schemas to expose through the API */
  exposedSchemas?: string[];
  /** Anonymous role name for unauthenticated requests */
  anonRole?: string;
  /** Default role name for authenticated requests */
  roleName?: string;
  /** Default database identifier to use */
  defaultDatabaseId?: string;
  /** Whether the API is publicly accessible */
  isPublic?: boolean;
  /** Schemas containing metadata tables */
  metaSchemas?: string[];
}

/**
 * Default websocket configuration
 */
export const websocketDefaults: WebsocketConfig = {
  enabled: false,
};

/**
 * Default grafserv configuration
 */
export const grafservDefaults: GrafservConfig = {
  graphqlPath: '/graphql',
  graphiqlPath: '/graphiql',
  websockets: websocketDefaults,
};

/**
 * Default GraphQL/Graphile configuration values
 */
export const graphileDefaults: GraphileOptions = {
  schema: [],
  extends: [],
  preset: {},
  grafserv: grafservDefaults,
};

/**
 * Default feature options for GraphQL/Graphile
 */
export const graphileFeatureDefaults: GraphileFeatureOptions = {
  simpleInflection: true,
  oppositeBaseNames: true,
  postgis: true,
};

/**
 * Default API configuration values
 */
export const apiDefaults: ApiOptions = {
  enableServicesApi: true,
  exposedSchemas: [],
  anonRole: 'administrator',
  roleName: 'administrator',
  defaultDatabaseId: 'hard-coded',
  isPublic: true,
  metaSchemas: [
    'services_public',
    'metaschema_public',
    'metaschema_modules_public',
  ],
};
