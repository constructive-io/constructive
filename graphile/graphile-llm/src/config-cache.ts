/**
 * config-cache — Per-database LLM billing configuration cache
 *
 * Caches resolved billing function names per database_id.
 * Uses an LRU cache with TTL so config changes propagate within a bounded window
 * without requiring a server restart.
 *
 * Resolution flow:
 *   Billing config from `metaschema_modules_public.billing_module`
 *   (schema name + function names for record_usage, check_billing_quota)
 *
 * All queries run through the Graphile `withPgClient` callback, which gives us
 * a client connected to the tenant database with proper role settings.
 *
 * The LLM module config (provider, model, etc.) is already resolved by the
 * LlmModulePlugin at schema-build time. This cache handles the runtime-only
 * billing piece.
 */

import type { PgClient as DataplanPgClient } from '@dataplan/pg';
import { ModuleConfigCache } from 'graphile-cache';

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * Generic pg client interface matching what Graphile's withPgClient provides.
 * Avoids a hard dependency on the `pg` package.
 */
export type PgClient = DataplanPgClient;

/**
 * Billing function metadata resolved from the billing_module metaschema table.
 */
export interface BillingConfig {
  /** Private schema containing the billing functions */
  privateSchema: string;
  /** Name of the record_usage function */
  recordUsageFunction: string;
  /** Name of the check_billing_quota function */
  checkBillingQuotaFunction: string;
  /** Public schema containing meters table */
  publicSchema: string;
}

/**
 * Inference log table metadata resolved from the inference_log_module.
 */
export interface InferenceLogConfig {
  /** Schema containing the usage_log_inference table */
  schema: string;
  /** Name of the inference log table */
  tableName: string;
}

/**
 * Per-database cached configuration for the LLM billing integration.
 */
export interface LlmBillingCacheEntry {
  /** Billing function references (null if billing_module not provisioned) */
  billing: BillingConfig | null;
  /** Inference log table references (null if inference_log_module not provisioned) */
  inferenceLog: InferenceLogConfig | null;
}

// ─── SQL Queries ────────────────────────────────────────────────────────────

/**
 * Check if the billing_module table exists before querying it.
 * This prevents hard errors on databases that don't have the billing
 * module provisioned (the metaschema_modules_public schema or the
 * billing_module table might not exist at all).
 */
const BILLING_MODULE_SQL = `
  SELECT
    s.schema_name AS public_schema,
    ps.schema_name AS private_schema,
    bm.record_usage_function
  FROM metaschema_modules_public.billing_module bm
  JOIN metaschema_public.schema s ON bm.schema_id = s.id
  JOIN metaschema_public.schema ps ON bm.private_schema_id = ps.id
  WHERE bm.database_id = $1
  LIMIT 1
`;

/**
 * Resolve the inference log module's schema and table name.
 */
const INFERENCE_LOG_MODULE_SQL = `
  SELECT
    s.schema_name AS schema,
    ilm.inference_log_table_name AS table_name
  FROM metaschema_modules_public.inference_log_module ilm
  JOIN metaschema_public.schema s ON ilm.schema_id = s.id
  WHERE ilm.database_id = $1
  LIMIT 1
`;
// ─── Cache ──────────────────────────────────────────────────────────────────

const billingCache = new ModuleConfigCache<LlmBillingCacheEntry>({
  name: 'billing-config',
  ttlMs: 5 * 60 * 1000, // 5 minutes
  max: 50
});

// ─── Resolution Functions ───────────────────────────────────────────────────

/** Check the exact optional module relation before querying it. */
const RELATION_EXISTS_SQL = `
  SELECT pg_catalog.to_regclass($1) AS relation
`;

async function resolveInferenceLogConfig(
  pgClient: PgClient,
  databaseId: string
): Promise<InferenceLogConfig | null> {
  const relationCheck = await pgClient.query<{ relation: string | null }>({
    text: RELATION_EXISTS_SQL,
    values: ['metaschema_modules_public.inference_log_module'],
  });
  if (!relationCheck.rows[0]?.relation) return null;

  const result = await pgClient.query<Record<string, unknown>>({
    text: INFERENCE_LOG_MODULE_SQL,
    values: [databaseId],
  });
  const row = result.rows[0];
  if (!row) return null;
  if (!row.schema || !row.table_name) {
    throw new Error('LLM_INFERENCE_LOG_CONFIG_INCOMPLETE');
  }

  return {
    schema: row.schema as string,
    tableName: row.table_name as string,
  };
}

async function resolveBillingConfig(
  pgClient: PgClient,
  databaseId: string
): Promise<BillingConfig | null> {
  const relationCheck = await pgClient.query<{ relation: string | null }>({
    text: RELATION_EXISTS_SQL,
    values: ['metaschema_modules_public.billing_module'],
  });
  if (!relationCheck.rows[0]?.relation) return null;

  const result = await pgClient.query<Record<string, unknown>>({
    text: BILLING_MODULE_SQL,
    values: [databaseId],
  });
  const row = result.rows[0];
  if (!row) return null;
  if (!row.public_schema || !row.private_schema || !row.record_usage_function) {
    throw new Error('LLM_BILLING_CONFIG_INCOMPLETE');
  }

  return {
    publicSchema: row.public_schema as string,
    privateSchema: row.private_schema as string,
    recordUsageFunction: row.record_usage_function as string,
    // The check_billing_quota function name follows the inflection pattern
    checkBillingQuotaFunction: 'check_billing_quota',
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Resolve billing config for a database.
 * Results are cached per database_id with a 5-minute TTL.
 *
 * @param pgClient - A client connected to the tenant database (from withPgClient)
 * @param databaseId - The database UUID
 */
export async function getLlmBillingConfig(
  pgClient: PgClient,
  databaseId: string
): Promise<LlmBillingCacheEntry> {
  const cached = billingCache.get(databaseId);
  if (cached) return cached;

  const [billing, inferenceLog] = await Promise.all([
    resolveBillingConfig(pgClient, databaseId),
    resolveInferenceLogConfig(pgClient, databaseId)
  ]);

  const entry: LlmBillingCacheEntry = { billing, inferenceLog };
  billingCache.set(databaseId, entry);
  return entry;
}

/**
 * Invalidate the cached config for a specific database (or all).
 */
export function invalidateLlmBillingConfig(databaseId?: string): void {
  if (databaseId) {
    billingCache.delete(databaseId);
  } else {
    billingCache.clear();
  }
}

/**
 * Get cache stats for diagnostics.
 */
export function getLlmBillingCacheStats(): { size: number; max: number } {
  return { size: billingCache.size, max: 50 };
}
