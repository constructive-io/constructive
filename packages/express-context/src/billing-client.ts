/**
 * billing-client — Shared billing operations for any Express-based service
 *
 * Provides a unified `BillingClient` that encapsulates:
 *   - `checkQuota(meterSlug, amount)` — pre-check billing quota
 *   - `recordUsage(meterSlug, amount, metadata)` — post-record usage
 *   - `logInference(entry)` — write to usage_log_inference table
 *
 * Both `agentic-server` and `graphile-llm` should delegate to this client
 * instead of implementing their own SQL calls.
 *
 * Graceful: all operations are no-ops if the billing/inference_log modules
 * are not provisioned. Errors are logged and swallowed (non-fatal).
 */

import { Logger } from '@pgpmjs/logger';

import type { BillingConfig, InferenceLogConfig, WithPgClient } from './types';

const log = new Logger('billing-client');

// ─── Types ──────────────────────────────────────────────────────────────────

export interface InferenceLogEntry {
  entityId: string;
  actorId: string | null;
  model: string;
  provider: string | null;
  service: string;
  operation: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  latencyMs: number;
  status: string;
  cacheReadTokens?: number | null;
  cacheWriteTokens?: number | null;
  ragEnabled?: boolean;
  chunksRetrieved?: number | null;
  embeddingModel?: string | null;
  embeddingLatencyMs?: number | null;
  errorType?: string | null;
  rawUsage?: Record<string, unknown> | null;
}

export interface BillingClient {
  /**
   * Check if the entity has sufficient quota for the requested amount.
   * Returns true if allowed, false if quota is exceeded.
   *
   * Gracefully returns true if billing is not provisioned or errors.
   */
  checkQuota(meterSlug: string, amount?: number): Promise<boolean>;

  /**
   * Record usage after a successful operation.
   * Gracefully skips if billing is not provisioned or errors.
   */
  recordUsage(meterSlug: string, amount: number, metadata?: Record<string, unknown>): Promise<void>;

  /**
   * Write a row to the usage_log_inference table.
   * Gracefully skips if inference_log_module is not provisioned or errors.
   */
  logInference(entry: InferenceLogEntry): Promise<void>;
}

// ─── Implementation ─────────────────────────────────────────────────────────

export function createBillingClient(
  withPgClient: WithPgClient,
  entityId: string,
  billing: BillingConfig | null,
  inferenceLog: InferenceLogConfig | null
): BillingClient {
  return {
    async checkQuota(meterSlug: string, amount = 1): Promise<boolean> {
      if (!billing) return true;

      try {
        return await withPgClient(async (client) => {
          const sql = `SELECT "${billing.privateSchema}"."${billing.checkBillingQuotaFunction}"($1, $2::uuid, $3) AS allowed`;
          const result = await client.query(sql, [meterSlug, entityId, amount]);
          return result.rows[0]?.allowed !== false;
        });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        log.warn(`check_billing_quota failed (allowing): ${message}`);
        return true;
      }
    },

    async recordUsage(meterSlug: string, amount: number, metadata?: Record<string, unknown>): Promise<void> {
      if (!billing) return;

      try {
        await withPgClient(async (client) => {
          const sql = `SELECT "${billing.privateSchema}"."${billing.recordUsageFunction}"($1, $2::uuid, $3, $4::jsonb)`;
          await client.query(sql, [meterSlug, entityId, amount, JSON.stringify(metadata ?? {})]);
        });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        log.warn(`record_usage failed (non-fatal): ${message}`);
      }
    },

    async logInference(entry: InferenceLogEntry): Promise<void> {
      if (!inferenceLog) return;

      try {
        await withPgClient(async (client) => {
          await client.query(
            `INSERT INTO "${inferenceLog.schema}"."${inferenceLog.tableName}"
             (entity_id, actor_id, model, provider, service, operation,
              input_tokens, output_tokens, total_tokens, latency_ms, status,
              cache_read_tokens, cache_write_tokens,
              rag_enabled, chunks_retrieved,
              embedding_model, embedding_latency_ms,
              error_type, raw_usage)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
            [
              entry.entityId, entry.actorId, entry.model,
              entry.provider, entry.service, entry.operation,
              entry.inputTokens, entry.outputTokens, entry.totalTokens,
              entry.latencyMs, entry.status,
              entry.cacheReadTokens ?? null, entry.cacheWriteTokens ?? null,
              entry.ragEnabled ?? false, entry.chunksRetrieved ?? null,
              entry.embeddingModel ?? null, entry.embeddingLatencyMs ?? null,
              entry.errorType ?? null,
              entry.rawUsage ? JSON.stringify(entry.rawUsage) : null
            ]
          );
        });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        log.warn(`inference log INSERT failed (non-fatal): ${message}`);
      }
    }
  };
}
