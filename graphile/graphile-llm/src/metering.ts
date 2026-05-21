/**
 * metering — Billing-aware wrappers for embedder and chat functions
 *
 * Wraps EmbedderFunction and ChatFunction with:
 *   1. Pre-check: `check_billing_quota(meter_slug, entity_id, estimated_amount)`
 *   2. Execute the underlying function
 *   3. Post-record: `record_usage(meter_slug, entity_id, actual_amount)`
 *
 * When the quota check fails, the wrapper returns null (graceful degradation)
 * instead of throwing, so the search pipeline can fall back to text-only.
 *
 * Token counts are estimated from text length (~4 chars per token). No
 * tokenizer needed — the billing system uses tokens as abstract units
 * and the credit_cost on each model's meter normalizes the relative expense.
 *
 * The billing functions live in the tenant database and are called via the
 * Graphile `withPgClient` callback. Function locations (schema, names) are
 * resolved from `billing_module` metaschema and cached by `config-cache.ts`.
 */

import type { PgClient, BillingConfig, InferenceLogConfig } from './config-cache';
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
  /** Per-request correlation ID (from request.id pgSetting) */
  requestId: string | null;
  /** Database UUID from JWT claims */
  databaseId: string;
  /** Actor (user) ID from JWT claims */
  actorId: string | null;
  /** Inference log table config (null if inference_log_module not provisioned) */
  inferenceLog: InferenceLogConfig | null;
}

export interface MeteringOptions {
  /** Meter slug for embedding operations (default: model name from build config) */
  embeddingMeterSlug?: string;
  /** Meter slug for chat completion operations (default: model name from build config) */
  chatMeterSlug?: string;
  /** Whether to skip metering entirely (e.g. for local dev). Default: false */
  skipMetering?: boolean;
  /** Embedding model name (for inference log) */
  embeddingModel?: string;
  /** Chat model name (for inference log) */
  chatModel?: string;
  /** Provider name (for inference log) */
  provider?: string;
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

// ─── Inference Usage Log ────────────────────────────────────────────────────

export interface InferenceLogEntry {
  databaseId: string;
  entityId: string;
  actorId: string | null;
  model: string;
  provider: string | null;
  requestType: 'embedding' | 'chat' | 'rag';
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  latencyMs: number;
  ragEnabled: boolean;
  chunksRetrieved: number | null;
  embeddingModel: string | null;
  embeddingLatencyMs: number | null;
  status: 'success' | 'quota_exceeded' | 'provider_error' | 'timeout';
  errorType: string | null;
}

/**
 * Write a row to the usage_log_inference table.
 * Gracefully skips if the inference_log_module is not provisioned.
 *
 * TODO: Also write to child (generated) database when dual-write is needed.
 */
export async function logInferenceUsage(
  ctx: MeteringContext,
  entry: InferenceLogEntry,
): Promise<void> {
  if (!ctx.inferenceLog) return;

  const { schema, tableName } = ctx.inferenceLog;
  const sql = `INSERT INTO "${schema}"."${tableName}" (
    database_id, entity_id, actor_id,
    model, provider, request_type,
    input_tokens, output_tokens, total_tokens,
    latency_ms, rag_enabled, chunks_retrieved,
    embedding_model, embedding_latency_ms,
    status, error_type
  ) VALUES (
    $1, $2, $3,
    $4, $5, $6,
    $7, $8, $9,
    $10, $11, $12,
    $13, $14,
    $15, $16
  )`;

  try {
    await ctx.withPgClient(ctx.pgSettings, async (pgClient) => {
      await pgClient.query(sql, [
        entry.databaseId, entry.entityId, entry.actorId,
        entry.model, entry.provider, entry.requestType,
        entry.inputTokens, entry.outputTokens, entry.totalTokens,
        entry.latencyMs, entry.ragEnabled, entry.chunksRetrieved,
        entry.embeddingModel, entry.embeddingLatencyMs,
        entry.status, entry.errorType,
      ]);
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.warn(`[graphile-llm] inference log INSERT failed (non-fatal): ${message}`);
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
    const result = await embedder(text);
    return {
      result,
      metered: false,
      quotaExceeded: false,
      latencyMs: Date.now() - startTime,
    };
  }

  if (options.skipMetering) {
    const result = await embedder(text);
    return {
      result,
      metered: false,
      quotaExceeded: false,
      latencyMs: Date.now() - startTime,
    };
  }

  // Pre-check: can this entity afford this call?
  let allowed = true;
  try {
    await ctx.withPgClient(ctx.pgSettings, async (pgClient) => {
      allowed = await checkQuota(pgClient, ctx.billing, ctx.entityId, meterSlug, 1);
    });
  } catch {
    allowed = true;
  }

  if (!allowed) {
    // Placeholder: replace with actual provider token counts once generateWithUsage() is approved
    const placeholderAmountTokens = Math.ceil(text.length / 4);
    logInferenceUsage(ctx, {
      databaseId: ctx.databaseId,
      entityId: ctx.entityId,
      actorId: ctx.actorId,
      model: options.embeddingModel ?? meterSlug,
      provider: options.provider ?? null,
      requestType: 'embedding',
      inputTokens: placeholderAmountTokens,
      outputTokens: 0,
      totalTokens: placeholderAmountTokens,
      latencyMs: Date.now() - startTime,
      ragEnabled: false,
      chunksRetrieved: null,
      embeddingModel: options.embeddingModel ?? null,
      embeddingLatencyMs: null,
      status: 'quota_exceeded',
      errorType: null,
    }).catch(() => {});

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

  // Placeholder: replace with actual provider token counts once generateWithUsage() is approved
  const placeholderAmountTokens = Math.ceil(text.length / 4);
  ctx.withPgClient(ctx.pgSettings, async (pgClient) => {
    await recordUsage(pgClient, ctx.billing, ctx.entityId, meterSlug, text.length, {
      request_id: ctx.requestId,
      input_chars: text.length,
      dims: result.length,
      latency_ms: latencyMs,
    });
  }).catch(() => {});

  // Log to inference usage table
  logInferenceUsage(ctx, {
    databaseId: ctx.databaseId,
    entityId: ctx.entityId,
    actorId: ctx.actorId,
    model: options.embeddingModel ?? meterSlug,
    provider: options.provider ?? null,
    requestType: 'embedding',
    inputTokens: placeholderAmountTokens,
    outputTokens: 0,
    totalTokens: placeholderAmountTokens,
    latencyMs,
    ragEnabled: false,
    chunksRetrieved: null,
    embeddingModel: options.embeddingModel ?? null,
    embeddingLatencyMs: latencyMs,
    status: 'success',
    errorType: null,
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

  if (meteringOptions.skipMetering) {
    const result = await chat(messages, chatOptions);
    return {
      result,
      metered: false,
      quotaExceeded: false,
      latencyMs: Date.now() - startTime,
    };
  }

  // Pre-check: can this entity afford this call?
  let allowed = true;
  try {
    await ctx.withPgClient(ctx.pgSettings, async (pgClient) => {
      allowed = await checkQuota(pgClient, ctx.billing, ctx.entityId, meterSlug, 1);
    });
  } catch {
    allowed = true;
  }

  if (!allowed) {
    // Placeholder: replace with actual provider token counts once generateWithUsage() is approved
    const placeholderInputTokens = Math.ceil(messages.reduce((sum, m) => sum + m.content.length, 0) / 4);
    logInferenceUsage(ctx, {
      databaseId: ctx.databaseId,
      entityId: ctx.entityId,
      actorId: ctx.actorId,
      model: meteringOptions.chatModel ?? meterSlug,
      provider: meteringOptions.provider ?? null,
      requestType: 'chat',
      inputTokens: placeholderInputTokens,
      outputTokens: 0,
      totalTokens: placeholderInputTokens,
      latencyMs: Date.now() - startTime,
      ragEnabled: false,
      chunksRetrieved: null,
      embeddingModel: null,
      embeddingLatencyMs: null,
      status: 'quota_exceeded',
      errorType: null,
    }).catch(() => {});

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

  // Placeholder: replace with actual provider token counts once generateWithUsage() is approved
  const inputChars = messages.reduce((sum, m) => sum + m.content.length, 0);
  const placeholderInputTokens = Math.ceil(inputChars / 4);
  const placeholderOutputTokens = Math.ceil(result.length / 4);
  const placeholderTotalTokens = placeholderInputTokens + placeholderOutputTokens;
  ctx.withPgClient(ctx.pgSettings, async (pgClient) => {
    await recordUsage(pgClient, ctx.billing, ctx.entityId, meterSlug, inputChars + result.length, {
      request_id: ctx.requestId,
      input_chars: inputChars,
      output_chars: result.length,
      messages_count: messages.length,
      latency_ms: latencyMs,
    });
  }).catch(() => {});

  // Log to inference usage table
  logInferenceUsage(ctx, {
    databaseId: ctx.databaseId,
    entityId: ctx.entityId,
    actorId: ctx.actorId,
    model: meteringOptions.chatModel ?? meterSlug,
    provider: meteringOptions.provider ?? null,
    requestType: 'chat',
    inputTokens: placeholderInputTokens,
    outputTokens: placeholderOutputTokens,
    totalTokens: placeholderTotalTokens,
    latencyMs,
    ragEnabled: false,
    chunksRetrieved: null,
    embeddingModel: null,
    embeddingLatencyMs: null,
    status: 'success',
    errorType: null,
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
