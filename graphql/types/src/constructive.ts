import {
  CDNOptions,
  DeploymentOptions,
  MigrationOptions,
  pgpmDefaults,
  PgpmOptions,
  PgTestConnectionOptions,
  ServerOptions} from '@pgpmjs/types';
import deepmerge from 'deepmerge';
import type { PgConfig, PgPoolConfig } from 'pg-env';

import {
  apiDefaults,
  ApiOptions,
  graphileDefaults,
  graphileFeatureDefaults,
  GraphileFeatureOptions,
  GraphileOptions} from './graphile';
import { LlmOptions } from './llm';
import { SmsOptions } from './sms';

/** Credential-free route facts used to resolve one runtime login. */
export interface RuntimePgResolverInput {
  databaseId: string;
  databaseName: string;
  apiId: string;
  /** Physical schemas in Graphile exposure order. */
  schemas: readonly string[];
  /** Request roles in `[anonymous, authenticated]` order. */
  roles: readonly [anonymous: string, authenticated: string];
}

export type RuntimePgConfig = Partial<PgConfig> & { pool?: PgPoolConfig };

/** Resolve a least-privilege login from credential-free exact route facts. */
export type RuntimePgResolver = (
  input: Readonly<RuntimePgResolverInput>
) => RuntimePgConfig | Promise<RuntimePgConfig>;

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
 * Full Constructive configuration options
 * Extends PgpmOptions with GraphQL/Graphile configuration
 */
export interface ConstructiveOptions extends PgpmOptions, ConstructiveGraphQLOptions {
  /** Test database configuration options */
  db?: Partial<PgTestConnectionOptions>;
  /** PostgreSQL connection configuration */
  pg?: Partial<PgConfig>;
  /** Static least-privilege tenant execution login. */
  runtimePg?: RuntimePgConfig;
  /** Exact route authorized to use the static runtime login. */
  runtimePgStaticIdentity?: RuntimePgResolverInput;
  /** Per-route least-privilege tenant execution login resolver. */
  runtimePgResolver?: RuntimePgResolver;
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
  /** LLM provider configuration (embeddings, chat, RAG) */
  llm?: LlmOptions;
  /** SMS provider configuration */
  sms?: SmsOptions;
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
