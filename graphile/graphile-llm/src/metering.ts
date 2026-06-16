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
 * Token counts:
 *   - Chat: real provider counts via ChatResult.usage (from OllamaAdapter.stream())
 *   - Embedding: real provider counts via EmbeddingResult.promptTokens (from /api/embed)
 *
 * The billing functions live in the tenant database and are called via the
 * Graphile `withPgClient` callback. Function locations (schema, names) are
 * resolved from `billing_module` metaschema and cached by `config-cache.ts`.
 */

import type { BillingClient } from '@constructive-io/express-context';
import { createBillingClient } from '@constructive-io/express-context';

import type { BillingConfig, InferenceLogConfig, PgClient } from './config-cache';
import type { ChatFunction, ChatMessage, ChatOptions, EmbedderFunction } from './types';

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

// ─── Billing Client Adapter ─────────────────────────────────────────────────

/**
 * Create a BillingClient from a MeteringContext by adapting Graphile's 2-arg
 * withPgClient(pgSettings, fn) to the express-context 1-arg withPgClient(fn).
 */
function billingClientFromCtx(ctx: MeteringContext): BillingClient {
  const adaptedWithPgClient = <T>(fn: (client: any) => Promise<T>): Promise<T> =>
    ctx.withPgClient(ctx.pgSettings, fn as any) as unknown as Promise<T>;

  return createBillingClient(
    adaptedWithPgClient,
    ctx.entityId,
    ctx.billing,
    ctx.inferenceLog
  );
}

// ─── Inference Usage Log ────────────────────────────────────────────────────

export interface InferenceLogEntry {
  databaseId: string;
  entityId: string;
  actorId: string | null;
  model: string;
  provider: string | null;
  service: 'llm' | 'embedding' | 'tts' | 'stt' | 'ocr' | 'image_gen' | 'search' | 'compute';
  operation: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cacheReadTokens: number | null;
  cacheWriteTokens: number | null;
  latencyMs: number;
  ragEnabled: boolean;
  chunksRetrieved: number | null;
  embeddingModel: string | null;
  embeddingLatencyMs: number | null;
  status: 'success' | 'quota_exceeded' | 'provider_error' | 'timeout';
  errorType: string | null;
  rawUsage: Record<string, unknown> | null;
}

/**
 * Write a row to the usage_log_inference table.
 * Delegates to the shared BillingClient from express-context.
 */
export async function logInferenceUsage(
  ctx: MeteringContext,
  entry: InferenceLogEntry
): Promise<void> {
  const client = billingClientFromCtx(ctx);
  return client.logInference({
    entityId: entry.entityId,
    actorId: entry.actorId,
    model: entry.model,
    provider: entry.provider,
    service: entry.service,
    operation: entry.operation,
    inputTokens: entry.inputTokens,
    outputTokens: entry.outputTokens,
    totalTokens: entry.totalTokens,
    latencyMs: entry.latencyMs,
    status: entry.status,
    cacheReadTokens: entry.cacheReadTokens,
    cacheWriteTokens: entry.cacheWriteTokens,
    ragEnabled: entry.ragEnabled,
    chunksRetrieved: entry.chunksRetrieved,
    embeddingModel: entry.embeddingModel,
    embeddingLatencyMs: entry.embeddingLatencyMs,
    errorType: entry.errorType,
    rawUsage: entry.rawUsage
  });
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
  options: MeteringOptions = {}
): Promise<MeterResult<number[]>> {
  const startTime = Date.now();

  // No billing context → just embed without metering
  if (!ctx) {
    const { embedding } = await embedder(text);
    return {
      result: embedding,
      metered: false,
      quotaExceeded: false,
      latencyMs: Date.now() - startTime
    };
  }

  const meterSlug = options.embeddingMeterSlug;
  if (!meterSlug) {
    const { embedding } = await embedder(text);
    return {
      result: embedding,
      metered: false,
      quotaExceeded: false,
      latencyMs: Date.now() - startTime
    };
  }

  if (options.skipMetering) {
    const { embedding } = await embedder(text);
    return {
      result: embedding,
      metered: false,
      quotaExceeded: false,
      latencyMs: Date.now() - startTime
    };
  }

  // Pre-check: can this entity afford this call?
  const billingClient = billingClientFromCtx(ctx);
  const allowed = await billingClient.checkQuota(meterSlug);

  if (!allowed) {
    logInferenceUsage(ctx, {
      databaseId: ctx.databaseId,
      entityId: ctx.entityId,
      actorId: ctx.actorId,
      model: options.embeddingModel ?? meterSlug,
      provider: options.provider ?? null,
      service: 'embedding',
      operation: 'create',
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      cacheReadTokens: null,
      cacheWriteTokens: null,
      latencyMs: Date.now() - startTime,
      ragEnabled: false,
      chunksRetrieved: null,
      embeddingModel: options.embeddingModel ?? null,
      embeddingLatencyMs: null,
      status: 'quota_exceeded',
      errorType: null,
      rawUsage: null
    }).catch(() => {});

    return {
      result: null,
      metered: true,
      quotaExceeded: true,
      latencyMs: Date.now() - startTime
    };
  }

  // Execute embedding — real token count from provider via EmbeddingResult
  const { embedding, promptTokens } = await embedder(text);
  const latencyMs = Date.now() - startTime;

  billingClient.recordUsage(meterSlug, promptTokens, {
    request_id: ctx.requestId,
    input_chars: text.length,
    prompt_tokens: promptTokens,
    dims: embedding.length,
    latency_ms: latencyMs
  }).catch(() => {});

  // Log to inference usage table
  logInferenceUsage(ctx, {
    databaseId: ctx.databaseId,
    entityId: ctx.entityId,
    actorId: ctx.actorId,
    model: options.embeddingModel ?? meterSlug,
    provider: options.provider ?? null,
    service: 'embedding',
    operation: 'create',
    inputTokens: promptTokens,
    outputTokens: 0,
    totalTokens: promptTokens,
    cacheReadTokens: null,
    cacheWriteTokens: null,
    latencyMs,
    ragEnabled: false,
    chunksRetrieved: null,
    embeddingModel: options.embeddingModel ?? null,
    embeddingLatencyMs: latencyMs,
    status: 'success',
    errorType: null,
    rawUsage: { prompt_tokens: promptTokens }
  }).catch(() => {});

  return {
    result: embedding,
    metered: true,
    quotaExceeded: false,
    latencyMs
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
  meteringOptions: MeteringOptions = {}
): Promise<MeterResult<string>> {
  const startTime = Date.now();

  if (!ctx) {
    const chatResult = await chat(messages, chatOptions);
    return {
      result: chatResult.content,
      metered: false,
      quotaExceeded: false,
      latencyMs: Date.now() - startTime
    };
  }

  const meterSlug = meteringOptions.chatMeterSlug;
  if (!meterSlug) {
    const chatResult = await chat(messages, chatOptions);
    return {
      result: chatResult.content,
      metered: false,
      quotaExceeded: false,
      latencyMs: Date.now() - startTime
    };
  }

  if (meteringOptions.skipMetering) {
    const chatResult = await chat(messages, chatOptions);
    return {
      result: chatResult.content,
      metered: false,
      quotaExceeded: false,
      latencyMs: Date.now() - startTime
    };
  }

  // Pre-check: can this entity afford this call?
  const billingClient = billingClientFromCtx(ctx);
  const allowed = await billingClient.checkQuota(meterSlug);

  if (!allowed) {
    const estimatedInputTokens = Math.ceil(messages.reduce((sum, m) => sum + m.content.length, 0) / 4);
    logInferenceUsage(ctx, {
      databaseId: ctx.databaseId,
      entityId: ctx.entityId,
      actorId: ctx.actorId,
      model: meteringOptions.chatModel ?? meterSlug,
      provider: meteringOptions.provider ?? null,
      service: 'llm',
      operation: 'chat',
      inputTokens: estimatedInputTokens,
      outputTokens: 0,
      totalTokens: estimatedInputTokens,
      cacheReadTokens: null,
      cacheWriteTokens: null,
      latencyMs: Date.now() - startTime,
      ragEnabled: false,
      chunksRetrieved: null,
      embeddingModel: null,
      embeddingLatencyMs: null,
      status: 'quota_exceeded',
      errorType: null,
      rawUsage: null
    }).catch(() => {});

    return {
      result: null,
      metered: true,
      quotaExceeded: true,
      latencyMs: Date.now() - startTime
    };
  }

  // Execute chat completion — returns real token usage from provider
  const chatResult = await chat(messages, chatOptions);
  const latencyMs = Date.now() - startTime;
  const usage = chatResult.usage;

  billingClient.recordUsage(meterSlug, usage.totalTokens, {
    request_id: ctx.requestId,
    input_tokens: usage.input,
    output_tokens: usage.output,
    cache_read_tokens: usage.cacheRead,
    cache_write_tokens: usage.cacheWrite,
    messages_count: messages.length,
    latency_ms: latencyMs
  }).catch(() => {});

  // Log to inference usage table with real provider token counts
  logInferenceUsage(ctx, {
    databaseId: ctx.databaseId,
    entityId: ctx.entityId,
    actorId: ctx.actorId,
    model: meteringOptions.chatModel ?? meterSlug,
    provider: meteringOptions.provider ?? null,
    service: 'llm',
    operation: 'chat',
    inputTokens: usage.input,
    outputTokens: usage.output,
    totalTokens: usage.totalTokens,
    cacheReadTokens: usage.cacheRead || null,
    cacheWriteTokens: usage.cacheWrite || null,
    latencyMs,
    ragEnabled: false,
    chunksRetrieved: null,
    embeddingModel: null,
    embeddingLatencyMs: null,
    status: 'success',
    errorType: null,
    rawUsage: { reasoning: usage.reasoning }
  }).catch(() => {});

  return {
    result: chatResult.content,
    metered: true,
    quotaExceeded: false,
    latencyMs
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
