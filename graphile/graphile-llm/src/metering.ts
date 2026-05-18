/**
 * metering — Billing-aware wrappers for embedder and chat functions
 *
 * Wraps EmbedderFunction and ChatFunction with:
 *   1. Pre-check: `check_billing_quota(meter_slug, entity_id, amount)`
 *   2. Execute the underlying function
 *   3. Post-record: `record_usage(meter_slug, entity_id, amount, metadata)`
 *
 * When the quota check fails, the wrapper returns null (graceful degradation)
 * instead of throwing, so the search pipeline can fall back to text-only.
 *
 * The billing functions live in the tenant database and are called via the
 * Graphile `withPgClient` callback. Function locations (schema, names) are
 * resolved from `billing_module` metaschema and cached by `config-cache.ts`.
 */

import type { PgClient, BillingConfig } from './config-cache';
import type { EmbedderFunction, ChatFunction, ChatMessage, ChatOptions } from './types';

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * Callback matching Graphile's withPgClient signature.
 * Acquires a pg client, calls the callback, then releases the client.
 */
export type WithPgClient = (
  pgSettings: Record<string, string>,
  callback: (pgClient: PgClient) => Promise<void>,
) => Promise<void>;

export interface MeteringContext {
  /** Callback to acquire a tenant database client */
  withPgClient: WithPgClient;
  /** pgSettings from the GraphQL context (for role/claims) */
  pgSettings: Record<string, string>;
  /** Billing function references from the billing_module */
  billing: BillingConfig;
  /** Entity ID to meter against (from JWT claims) */
  entityId: string;
}

export interface MeteringOptions {
  /** Meter slug for embedding operations (default: model name from build config) */
  embeddingMeterSlug?: string;
  /** Meter slug for chat completion operations (default: model name from build config) */
  chatMeterSlug?: string;
  /** Estimated tokens per embedding call (for pre-check). Default: 256 */
  estimatedEmbeddingTokens?: number;
  /** Whether to skip metering entirely (e.g. for local dev). Default: false */
  skipMetering?: boolean;
}

export interface MeterResult<T> {
  /** The result from the underlying function, or null if quota exceeded */
  result: T | null;
  /** Whether the call was metered */
  metered: boolean;
  /** Whether the call was skipped due to quota limits */
  quotaExceeded: boolean;
  /** Latency of the underlying function call in ms */
  latencyMs: number;
}

// ─── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_ESTIMATED_EMBEDDING_TOKENS = 256;

// ─── Billing SQL Helpers ────────────────────────────────────────────────────

/**
 * Check if the entity has sufficient quota for the requested amount.
 * Returns true if the call is allowed, false if quota is exceeded.
 *
 * Gracefully returns true if the billing function doesn't exist or errors —
 * metering is opt-in, so missing infrastructure means "allow".
 */
async function checkQuota(
  pgClient: PgClient,
  billing: BillingConfig,
  entityId: string,
  meterSlug: string,
  amount: number,
): Promise<boolean> {
  try {
    const sql = `SELECT "${billing.privateSchema}"."${billing.checkBillingQuotaFunction}"($1, $2::uuid, $3) AS allowed`;
    const result = await pgClient.query(sql, [meterSlug, entityId, amount]);
    return result.rows[0]?.allowed !== false;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.warn(`[graphile-llm] check_billing_quota failed (allowing): ${message}`);
    return true;
  }
}

/**
 * Record usage after a successful call.
 * Gracefully skips if the billing function doesn't exist or errors.
 */
async function recordUsage(
  pgClient: PgClient,
  billing: BillingConfig,
  entityId: string,
  meterSlug: string,
  amount: number,
  metadata: Record<string, unknown>,
): Promise<void> {
  try {
    const sql = `SELECT "${billing.privateSchema}"."${billing.recordUsageFunction}"($1, $2::uuid, $3, $4::jsonb)`;
    await pgClient.query(sql, [meterSlug, entityId, amount, JSON.stringify(metadata)]);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.warn(`[graphile-llm] record_usage failed (non-fatal): ${message}`);
  }
}

// ─── Metered Embedder ───────────────────────────────────────────────────────

/**
 * Wrap an embedder with billing quota check + usage recording.
 *
 * The returned MeterResult contains `quotaExceeded: true` when the pre-check
 * fails, enabling the caller to fall back to text-only search.
 */
export async function meteredEmbed(
  embedder: EmbedderFunction,
  text: string,
  ctx: MeteringContext | null,
  options: MeteringOptions = {},
): Promise<MeterResult<number[]>> {
  const startTime = Date.now();

  // No billing context → just embed without metering
  if (!ctx) {
    const result = await embedder(text);
    return {
      result,
      metered: false,
      quotaExceeded: false,
      latencyMs: Date.now() - startTime,
    };
  }

  const meterSlug = options.embeddingMeterSlug;
  if (!meterSlug) {
    // No meter slug configured — can't meter without knowing the model name
    const result = await embedder(text);
    return {
      result,
      metered: false,
      quotaExceeded: false,
      latencyMs: Date.now() - startTime,
    };
  }
  const estimatedTokens = options.estimatedEmbeddingTokens ?? DEFAULT_ESTIMATED_EMBEDDING_TOKENS;
  const skip = options.skipMetering ?? false;

  if (skip) {
    const result = await embedder(text);
    return {
      result,
      metered: false,
      quotaExceeded: false,
      latencyMs: Date.now() - startTime,
    };
  }

  // Pre-check quota via withPgClient
  let allowed = true;
  try {
    await ctx.withPgClient(ctx.pgSettings, async (pgClient) => {
      allowed = await checkQuota(pgClient, ctx.billing, ctx.entityId, meterSlug, estimatedTokens);
    });
  } catch {
    // If we can't check quota, allow the call
    allowed = true;
  }

  if (!allowed) {
    console.log(
      `[graphile-llm] Embedding quota exceeded: entity=${ctx.entityId}, meter=${meterSlug}`
    );
    return {
      result: null,
      metered: true,
      quotaExceeded: true,
      latencyMs: Date.now() - startTime,
    };
  }

  // Execute embedding
  const result = await embedder(text);
  const latencyMs = Date.now() - startTime;

  // Estimate actual token count (rough: ~4 chars per token)
  const actualTokens = Math.ceil(text.length / 4);

  // Record usage (fire-and-forget via withPgClient)
  ctx.withPgClient(ctx.pgSettings, async (pgClient) => {
    await recordUsage(pgClient, ctx.billing, ctx.entityId, meterSlug, actualTokens, {
      type: 'embedding',
      dims: result.length,
      input_chars: text.length,
      latency_ms: latencyMs,
    });
  }).catch(() => {});

  return {
    result,
    metered: true,
    quotaExceeded: false,
    latencyMs,
  };
}

// ─── Metered Chat ───────────────────────────────────────────────────────────

/**
 * Wrap a chat completion call with billing quota check + usage recording.
 */
export async function meteredChat(
  chat: ChatFunction,
  messages: ChatMessage[],
  ctx: MeteringContext | null,
  chatOptions?: ChatOptions,
  meteringOptions: MeteringOptions = {},
): Promise<MeterResult<string>> {
  const startTime = Date.now();

  if (!ctx) {
    const result = await chat(messages, chatOptions);
    return {
      result,
      metered: false,
      quotaExceeded: false,
      latencyMs: Date.now() - startTime,
    };
  }

  const meterSlug = meteringOptions.chatMeterSlug;
  if (!meterSlug) {
    const result = await chat(messages, chatOptions);
    return {
      result,
      metered: false,
      quotaExceeded: false,
      latencyMs: Date.now() - startTime,
    };
  }
  const skip = meteringOptions.skipMetering ?? false;

  if (skip) {
    const result = await chat(messages, chatOptions);
    return {
      result,
      metered: false,
      quotaExceeded: false,
      latencyMs: Date.now() - startTime,
    };
  }

  // Estimate input tokens from message content
  const inputChars = messages.reduce((sum, m) => sum + m.content.length, 0);
  const estimatedInputTokens = Math.ceil(inputChars / 4);
  const estimatedOutputTokens = chatOptions?.maxTokens ?? 1000;
  const estimatedTotal = estimatedInputTokens + estimatedOutputTokens;

  // Pre-check quota
  let allowed = true;
  try {
    await ctx.withPgClient(ctx.pgSettings, async (pgClient) => {
      allowed = await checkQuota(pgClient, ctx.billing, ctx.entityId, meterSlug, estimatedTotal);
    });
  } catch {
    allowed = true;
  }

  if (!allowed) {
    console.log(
      `[graphile-llm] Chat quota exceeded: entity=${ctx.entityId}, meter=${meterSlug}`
    );
    return {
      result: null,
      metered: true,
      quotaExceeded: true,
      latencyMs: Date.now() - startTime,
    };
  }

  // Execute chat completion
  const result = await chat(messages, chatOptions);
  const latencyMs = Date.now() - startTime;

  // Estimate actual tokens (input + output)
  const actualOutputTokens = Math.ceil(result.length / 4);
  const actualTotal = estimatedInputTokens + actualOutputTokens;

  // Record usage (fire-and-forget)
  ctx.withPgClient(ctx.pgSettings, async (pgClient) => {
    await recordUsage(pgClient, ctx.billing, ctx.entityId, meterSlug, actualTotal, {
      type: 'chat',
      input_tokens: estimatedInputTokens,
      output_tokens: actualOutputTokens,
      messages_count: messages.length,
      latency_ms: latencyMs,
    });
  }).catch(() => {});

  return {
    result,
    metered: true,
    quotaExceeded: false,
    latencyMs,
  };
}

// ─── Error Types ────────────────────────────────────────────────────────────

export class QuotaExceededError extends Error {
  public readonly code = 'QUOTA_EXCEEDED';
  public readonly meterSlug: string;
  public readonly entityId: string;

  constructor(meterSlug: string, entityId: string) {
    super(
      `LLM quota exceeded for meter '${meterSlug}' on entity '${entityId}'. ` +
      'Upgrade your plan or wait for the next billing period.'
    );
    this.name = 'QuotaExceededError';
    this.meterSlug = meterSlug;
    this.entityId = entityId;
  }
}
