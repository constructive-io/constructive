import deepmerge from 'deepmerge';
import { PgConfig } from 'pg-env';
import {
  PgpmOptions,
  pgpmDefaults,
  PgTestConnectionOptions,
  DeploymentOptions,
  ServerOptions,
  CDNOptions,
  MigrationOptions,
  JobsConfig
} from '@pgpmjs/types';
import {
  GraphileOptions,
  GraphileFeatureOptions,
  ApiOptions,
  graphileDefaults,
  graphileFeatureDefaults,
  apiDefaults
} from './graphile';

/**
 * GraphQL-specific options for Constructive
 */
export interface ConstructiveGraphQLOptions {
  /** PostGraphile/Graphile configuration */
  graphile?: GraphileOptions;
  /** Feature flags and toggles for GraphQL */
  features?: GraphileFeatureOptions;
  /** API configuration options */
  api?: ApiOptions;
}

/**
 * OAuth provider configuration
 */
export interface OAuthProviderOptions {
  clientId?: string;
  clientSecret?: string;
  callbackUrl?: string;
}

/**
 * Auth/OAuth configuration
 */
export interface OAuthOptions {
  /** Optional front-end callback URL to redirect with token query */
  frontendCallbackUrl?: string;
  google?: OAuthProviderOptions;
  github?: OAuthProviderOptions;
}

/**
 * Full Constructive configuration options
 * Extends PgpmOptions with GraphQL/Graphile configuration
 */
export interface ConstructiveOptions extends PgpmOptions, ConstructiveGraphQLOptions {
  /** Test database configuration options */
  db?: Partial<PgTestConnectionOptions>;
  /** PostgreSQL connection configuration */
  pg?: Partial<PgConfig>;
  /** PostGraphile/Graphile configuration */
  graphile?: GraphileOptions;
  /** HTTP server configuration */
  server?: ServerOptions;
  /** Feature flags and toggles for GraphQL */
  features?: GraphileFeatureOptions;
  /** API configuration options */
  api?: ApiOptions;
  /** CDN and file storage configuration */
  cdn?: CDNOptions;
  /** Module deployment configuration */
  deployment?: DeploymentOptions;
  /** Migration and code generation options */
  migrations?: MigrationOptions;
  /** Job system configuration */
  jobs?: JobsConfig;
}

/**
 * Default GraphQL-specific configuration values
 */
export const constructiveGraphqlDefaults: ConstructiveGraphQLOptions = {
  graphile: graphileDefaults,
  features: graphileFeatureDefaults,
  api: apiDefaults
};

/**
 * Full default configuration values for Constructive framework
 * Combines PGPM core defaults with GraphQL/Graphile defaults
 */
export const constructiveDefaults: ConstructiveOptions = deepmerge.all([
  pgpmDefaults,
  constructiveGraphqlDefaults
]) as ConstructiveOptions;
