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

/** Process-wide routing-label metadata cache configuration. */
export interface RoutingCacheOptions {
  /** Maximum resolved service labels retained by one GraphQL server process. */
  maxEntries?: number;
}

/** Credential-free routing input for resolving one physical listener login. */
export interface NotificationPgResolverInput {
  databaseId: string;
  databaseName: string;
  apiId: string;
  schemas: readonly string[];
}

export type NotificationPgConfig = Partial<PgConfig> & { pool?: PgPoolConfig };

/**
 * Resolve a dedicated notification login for one physical database. The
 * result must explicitly contain its user and password; server code never
 * falls back to runtime or control-plane credentials.
 */
export type NotificationPgResolver = (
  input: Readonly<NotificationPgResolverInput>
) => NotificationPgConfig | Promise<NotificationPgConfig>;

/** Credential-free exact route contract for one tenant execution identity. */
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

/**
 * Resolve one least-privilege tenant execution login from the exact routed
 * contract. Results must contain explicit user, password, and database fields;
 * control-plane credentials are never inherited.
 */
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
  /** Routing-label metadata cache configuration */
  routingCache?: RoutingCacheOptions;
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
  /**
   * Static least-privilege PostgreSQL login used for tenant GraphQL execution.
   * Production and scoped introspection require `runtimePgStaticIdentity` and
   * accept this login for that one exact route only. Multi-tenant servers must
   * use `runtimePgResolver` instead.
   */
  runtimePg?: RuntimePgConfig;
  /** Exact credential-free route authorized to use the static `runtimePg`. */
  runtimePgStaticIdentity?: RuntimePgResolverInput;
  /** Per-route least-privilege tenant execution login resolver. */
  runtimePgResolver?: RuntimePgResolver;
  /** Per-physical-database login resolver used only by shared realtime LISTEN. */
  notificationPgResolver?: NotificationPgResolver;
  /** PostGraphile/Graphile configuration */
  graphile?: GraphileOptions;
  /** HTTP server configuration */
  server?: ServerOptions;
  /** Feature flags and toggles for GraphQL */
  features?: GraphileFeatureOptions;
  /** API configuration options */
  api?: ApiOptions;
  /** Routing-label metadata cache configuration */
  routingCache?: RoutingCacheOptions;
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
  api: apiDefaults,
  routingCache: {}
};

/**
 * Full default configuration values for Constructive framework
 * Combines PGPM core defaults with GraphQL/Graphile defaults
 */
export const constructiveDefaults: ConstructiveOptions = deepmerge.all([
  pgpmDefaults,
  constructiveGraphqlDefaults
]) as ConstructiveOptions;
