/**
 * config-cache — Per-database LLM + billing configuration cache
 *
 * Caches resolved billing function names and API key references per database_id.
 * Uses an LRU cache with TTL so config changes propagate within a bounded window
 * without requiring a server restart.
 *
 * Resolution flow:
 *   1. Billing config from `metaschema_modules_public.billing_module`
 *      (schema name + function names for record_usage, check_billing_quota)
 *   2. API key from `app_secrets_get(name)` in the encrypted_secrets private schema
 *
 * All queries run through the Graphile `withPgClient` callback, which gives us
 * a client connected to the tenant database with proper role settings.
 *
 * The LLM module config (provider, model, etc.) is already resolved by the
 * LlmModulePlugin at schema-build time. This cache handles the runtime-only
 * pieces: billing and secrets.
 */

import { LRUCache } from 'lru-cache';

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * Generic pg client interface matching what Graphile's withPgClient provides.
 * Avoids a hard dependency on the `pg` package.
 */
export interface PgClient {
  query(sql: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
}

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
 * Per-database cached configuration for the LLM billing integration.
 */
export interface LlmBillingCacheEntry {
  /** Billing function references (null if billing_module not provisioned) */
  billing: BillingConfig | null;
  /** Resolved (decrypted) API key from app_secrets (null if not stored) */
  apiKey: string | null;
}

// ─── SQL Queries ────────────────────────────────────────────────────────────

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
 * Discover the private schema for the encrypted_secrets module.
 * The app_secrets_get function lives in this schema.
 */
const ENCRYPTED_SECRETS_SCHEMA_SQL = `
  SELECT ps.schema_name AS private_schema
  FROM metaschema_modules_public.encrypted_secrets_module esm
  JOIN metaschema_public.schema ps ON esm.private_schema_id = ps.id
  WHERE esm.database_id = $1
  LIMIT 1
`;

// ─── Cache ──────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_MAX_ENTRIES = 50;

const billingCache = new LRUCache<string, LlmBillingCacheEntry>({
  max: CACHE_MAX_ENTRIES,
  ttl: CACHE_TTL_MS,
  updateAgeOnGet: true,
});

// ─── Resolution Functions ───────────────────────────────────────────────────

async function resolveBillingConfig(
  pgClient: PgClient,
  databaseId: string,
): Promise<BillingConfig | null> {
  try {
    const result = await pgClient.query(BILLING_MODULE_SQL, [databaseId]);
    const row = result.rows[0];
    if (!row?.record_usage_function) return null;

    return {
      publicSchema: row.public_schema as string,
      privateSchema: row.private_schema as string,
      recordUsageFunction: row.record_usage_function as string,
      // The check_billing_quota function name follows the inflection pattern
      checkBillingQuotaFunction: 'check_billing_quota',
    };
  } catch {
    return null;
  }
}

/**
 * Resolve a decrypted API key from app_secrets.
 *
 * The `api_key_ref` in llm_module data points to a secret name in app_secrets.
 * The generated `app_secrets_get(name, default_value)` function decrypts and
 * returns the plaintext value.
 *
 * Supports two ref formats:
 *   - `env://VAR_NAME` → reads from process.env
 *   - `secret_name`    → reads from app_secrets table via generated function
 */
async function resolveApiKey(
  pgClient: PgClient,
  databaseId: string,
  apiKeyRef?: string,
): Promise<string | null> {
  if (!apiKeyRef) return null;

  // env:// prefix → resolve from environment
  if (apiKeyRef.startsWith('env://')) {
    const envVar = apiKeyRef.slice(6);
    return process.env[envVar] ?? null;
  }

  // Discover the encrypted_secrets private schema
  try {
    const schemaResult = await pgClient.query(ENCRYPTED_SECRETS_SCHEMA_SQL, [databaseId]);
    const privateSchema = schemaResult.rows[0]?.private_schema as string | undefined;
    if (!privateSchema) return null;

    const result = await pgClient.query(
      `SELECT "${privateSchema}".app_secrets_get($1, NULL) AS value`,
      [apiKeyRef],
    );
    const value = result.rows[0]?.value as string | null;
    return value ?? null;
  } catch {
    return null;
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Resolve billing config + API key for a database.
 * Results are cached per database_id with a 5-minute TTL.
 *
 * @param pgClient - A client connected to the tenant database (from withPgClient)
 * @param databaseId - The database UUID
 * @param apiKeyRef - Optional api_key_ref from the llm_module config
 */
export async function getLlmBillingConfig(
  pgClient: PgClient,
  databaseId: string,
  apiKeyRef?: string,
): Promise<LlmBillingCacheEntry> {
  const cached = billingCache.get(databaseId);
  if (cached) return cached;

  const [billing, apiKey] = await Promise.all([
    resolveBillingConfig(pgClient, databaseId),
    resolveApiKey(pgClient, databaseId, apiKeyRef),
  ]);

  const entry: LlmBillingCacheEntry = { billing, apiKey };
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
  return { size: billingCache.size, max: CACHE_MAX_ENTRIES };
}
