/**
 * Module Loader Types
 *
 * A ModuleLoader is a per-database cached lookup that resolves config
 * from the routing DB or tenant DB. Each loader owns its own LRU cache
 * keyed by databaseId, with independent TTL and eviction.
 *
 * Loaders are registered in a LoaderRegistry and resolved in parallel
 * during context building. The result is a typed modules map on
 * `req.constructive.modules`.
 */

import type { Pool } from 'pg';

/**
 * Context passed to every loader's resolve function.
 * Provides both pool references so the loader can query whichever
 * database tier it needs.
 */
export interface LoaderContext {
  /** Routing/configuration database pool (for constructive_routing_public.* lookups) */
  routingPool: Pool;
  /** Tenant database pool (for metaschema_modules_public.* lookups) */
  tenantPool: Pool;
  /** UUID of the database being resolved */
  databaseId: string;
  /** UUID of the API (if resolved from domain/api-name lookup) */
  apiId?: string;
  /** Tenant database name */
  dbname: string;
}

/**
 * A single module loader. Encapsulates the SQL query, type transform,
 * and per-databaseId LRU cache for one piece of per-database config.
 */
export interface ModuleLoader<T = unknown> {
  /** Unique name (used in log prefix and as the key in the modules map) */
  readonly name: string;
  /** Resolve the module config for a given database. Returns undefined if not provisioned. */
  resolve(ctx: LoaderContext): Promise<T | undefined>;
  /** Invalidate the cache for one database (or all databases if omitted) */
  invalidate(databaseId?: string): void;
  /** Current number of cached entries */
  readonly cacheSize: number;
}
