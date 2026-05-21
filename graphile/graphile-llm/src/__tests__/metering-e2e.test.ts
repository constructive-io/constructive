/**
 * Metering E2E Integration Tests
 *
 * Full pipeline: Ollama embedding → metering check_billing_quota →
 * record_usage → inference_log INSERT → billing ledger write.
 *
 * Requires:
 *   - PostgreSQL (via pgsql-test)
 *   - Ollama running at OLLAMA_BASE_URL (default: http://127.0.0.1:11434)
 *   - nomic-embed-text model pulled
 *
 * Skip condition: set SKIP_OLLAMA_TESTS=1 to skip when Ollama is unavailable.
 *
 * Run:
 *   pnpm test -- --testPathPattern=metering-e2e
 */

import { join } from 'path';
import OllamaClient from '@agentic-kit/ollama';
import { getConnections, seed } from 'graphile-test';
import type { PgTestClient } from 'pgsql-test';
import { buildEmbedder } from '../../src/embedder';
import { meteredEmbed, logInferenceUsage } from '../../src/metering';
import { invalidateLlmBillingConfig, getLlmBillingConfig } from '../../src/config-cache';
import type { MeteringContext, WithPgClient } from '../../src/metering';
import type { BillingConfig, InferenceLogConfig, PgClient } from '../../src/config-cache';
import type { EmbedderFunction } from '../../src/types';

// ─── Constants ──────────────────────────────────────────────────────────────

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434';
const SKIP_OLLAMA = process.env.SKIP_OLLAMA_TESTS === '1';
const DATABASE_ID = '00000000-0000-0000-0000-000000000001';
const ENTITY_ID = '00000000-0000-0000-0000-000000000099';
const ACTOR_ID = '00000000-0000-0000-0000-000000000099';
const REQUEST_ID = '00000000-0000-0000-0000-00000000e001';

// ─── Ollama availability check ──────────────────────────────────────────────

let ollamaAvailable = false;

async function checkOllama(): Promise<boolean> {
  if (SKIP_OLLAMA) return false;
  try {
    const client = new OllamaClient(OLLAMA_BASE_URL);
    const models = await client.listModels();
    return models.some((m: string) => m.includes('nomic-embed-text'));
  } catch {
    return false;
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function createWithPgClient(pg: PgTestClient): WithPgClient {
  return async (_pgSettings, callback) => {
    await callback(pg as unknown as PgClient);
  };
}

async function buildMeteringCtx(
  pg: PgTestClient,
  overrides: Partial<MeteringContext> = {},
): Promise<MeteringContext> {
  const billing: BillingConfig = {
    publicSchema: 'billing_public',
    privateSchema: 'billing_private',
    recordUsageFunction: 'record_usage',
    checkBillingQuotaFunction: 'check_billing_quota',
  };

  const inferenceLog: InferenceLogConfig = {
    schema: 'usage_public',
    tableName: 'usage_log_inferences',
  };

  return {
    withPgClient: createWithPgClient(pg),
    pgSettings: {
      'jwt.claims.user_id': ENTITY_ID,
      'jwt.claims.database_id': DATABASE_ID,
      'request.id': REQUEST_ID,
    },
    billing,
    entityId: ENTITY_ID,
    requestId: REQUEST_ID,
    databaseId: DATABASE_ID,
    actorId: ACTOR_ID,
    inferenceLog,
    ...overrides,
  };
}

// =============================================================================
// TEST SUITE
// =============================================================================

describe('Metering E2E', () => {
  let pg: PgTestClient;
  let teardown: () => Promise<void>;

  jest.setTimeout(60_000);

  beforeAll(async () => {
    ollamaAvailable = await checkOllama();

    const connections = await getConnections(
      {
        schemas: ['billing_public', 'billing_private', 'usage_public', 'metaschema_public', 'metaschema_modules_public'],
        useRoot: true,
        authRole: 'postgres',
      },
      [seed.sqlfile([join(__dirname, './metering-setup.sql')])],
    );

    pg = connections.db;
    teardown = connections.teardown;
  });

  afterAll(async () => {
    invalidateLlmBillingConfig();
    if (teardown) await teardown();
  });

  beforeEach(async () => {
    await pg.beforeEach();
    invalidateLlmBillingConfig();
  });

  afterEach(async () => {
    await pg.afterEach();
  });

  // ===========================================================================
  // 1. Config resolution — getLlmBillingConfig reads metaschema tables
  // ===========================================================================

  describe('config resolution', () => {
    it('resolves billing config from metaschema_modules_public', async () => {
      const entry = await getLlmBillingConfig(pg as unknown as PgClient, DATABASE_ID);
      expect(entry.billing).not.toBeNull();
      expect(entry.billing!.publicSchema).toBe('billing_public');
      expect(entry.billing!.privateSchema).toBe('billing_private');
      expect(entry.billing!.recordUsageFunction).toBe('record_usage');
    });

    it('resolves inference log config from metaschema_modules_public', async () => {
      const entry = await getLlmBillingConfig(pg as unknown as PgClient, DATABASE_ID);
      expect(entry.inferenceLog).not.toBeNull();
      expect(entry.inferenceLog!.schema).toBe('usage_public');
      expect(entry.inferenceLog!.tableName).toBe('usage_log_inferences');
    });

    it('returns null billing for unknown database_id', async () => {
      const entry = await getLlmBillingConfig(
        pg as unknown as PgClient,
        'ffffffff-ffff-ffff-ffff-ffffffffffff',
      );
      expect(entry.billing).toBeNull();
      expect(entry.inferenceLog).toBeNull();
    });
  });

  // ===========================================================================
  // 2. Billing function stubs — check_billing_quota + record_usage
  // ===========================================================================

  describe('billing functions', () => {
    it('check_billing_quota returns true when no credits row exists (unlimited)', async () => {
      const result = await pg.any<{ allowed: boolean }>(
        `SELECT billing_private.check_billing_quota('nomic-embed-text', $1, 100) AS allowed`,
        [ENTITY_ID],
      );
      expect(result[0].allowed).toBe(true);
    });

    it('check_billing_quota returns true when under limit', async () => {
      await pg.query(
        `INSERT INTO billing_public.meter_credits (entity_id, meter_slug, credit_amount) VALUES ($1, 'nomic-embed-text', 1000)`,
        [ENTITY_ID],
      );
      const result = await pg.any<{ allowed: boolean }>(
        `SELECT billing_private.check_billing_quota('nomic-embed-text', $1, 100) AS allowed`,
        [ENTITY_ID],
      );
      expect(result[0].allowed).toBe(true);
    });

    it('check_billing_quota returns false when over limit', async () => {
      await pg.query(
        `INSERT INTO billing_public.meter_credits (entity_id, meter_slug, credit_amount) VALUES ($1, 'nomic-embed-text', 50)`,
        [ENTITY_ID],
      );
      await pg.query(
        `INSERT INTO billing_public.balances (entity_id, meter_slug, balance) VALUES ($1, 'nomic-embed-text', 45)`,
        [ENTITY_ID],
      );
      const result = await pg.any<{ allowed: boolean }>(
        `SELECT billing_private.check_billing_quota('nomic-embed-text', $1, 10) AS allowed`,
        [ENTITY_ID],
      );
      expect(result[0].allowed).toBe(false);
    });

    it('record_usage writes to balance and ledger', async () => {
      await pg.query(
        `SELECT billing_private.record_usage('nomic-embed-text', $1, 42, '{"request_id":"test"}'::jsonb)`,
        [ENTITY_ID],
      );

      const balances = await pg.any<{ balance: string }>(
        `SELECT balance FROM billing_public.balances WHERE entity_id = $1 AND meter_slug = 'nomic-embed-text'`,
        [ENTITY_ID],
      );
      expect(Number(balances[0].balance)).toBe(42);

      const ledger = await pg.any<{ amount: string; metadata: Record<string, unknown> }>(
        `SELECT amount, metadata FROM billing_public.ledger WHERE entity_id = $1 AND meter_slug = 'nomic-embed-text'`,
        [ENTITY_ID],
      );
      expect(ledger.length).toBe(1);
      expect(Number(ledger[0].amount)).toBe(42);
      expect(ledger[0].metadata).toEqual({ request_id: 'test' });
    });
  });

  // ===========================================================================
  // 3. Inference log — logInferenceUsage writes to usage_log_inferences
  // ===========================================================================

  describe('inference log', () => {
    it('logInferenceUsage inserts a row with all fields', async () => {
      const ctx = await buildMeteringCtx(pg);

      await logInferenceUsage(ctx, {
        databaseId: DATABASE_ID,
        entityId: ENTITY_ID,
        actorId: ACTOR_ID,
        model: 'nomic-embed-text',
        provider: 'ollama',
        service: 'embedding',
        operation: 'create',
        inputTokens: 100,
        outputTokens: 0,
        totalTokens: 100,
        cacheReadTokens: null,
        cacheWriteTokens: null,
        latencyMs: 50,
        ragEnabled: false,
        chunksRetrieved: null,
        embeddingModel: 'nomic-embed-text',
        embeddingLatencyMs: 50,
        status: 'success',
        errorType: null,
        rawUsage: null,
      });

      const rows = await pg.any<{
        model: string;
        service: string;
        operation: string;
        entity_id: string;
        input_tokens: string;
        status: string;
      }>(
        `SELECT model, service, operation, entity_id, input_tokens, status
         FROM usage_public.usage_log_inferences
         WHERE entity_id = $1`,
        [ENTITY_ID],
      );

      expect(rows.length).toBe(1);
      expect(rows[0].model).toBe('nomic-embed-text');
      expect(rows[0].service).toBe('embedding');
      expect(rows[0].operation).toBe('create');
      expect(rows[0].status).toBe('success');
      expect(Number(rows[0].input_tokens)).toBe(100);
    });
  });

  // ===========================================================================
  // 4. meteredEmbed — full pipeline with mock embedder
  // ===========================================================================

  describe('meteredEmbed with mock embedder', () => {
    const mockEmbedder: EmbedderFunction = async (_text: string) => [1, 0, 0];

    it('calls embedder and records usage when quota allows', async () => {
      const ctx = await buildMeteringCtx(pg);
      const result = await meteredEmbed(mockEmbedder, 'hello world', ctx, {
        embeddingMeterSlug: 'nomic-embed-text',
        embeddingModel: 'nomic-embed-text',
      });

      expect(result.metered).toBe(true);
      expect(result.quotaExceeded).toBe(false);
      expect(result.result).toEqual([1, 0, 0]);

      // Wait for async billing writes
      await new Promise((r) => setTimeout(r, 200));

      // Verify ledger entry
      const ledger = await pg.any<{ meter_slug: string; metadata: Record<string, unknown> }>(
        `SELECT meter_slug, metadata FROM billing_public.ledger WHERE entity_id = $1`,
        [ENTITY_ID],
      );
      expect(ledger.length).toBe(1);
      expect(ledger[0].meter_slug).toBe('nomic-embed-text');
      expect(ledger[0].metadata).toHaveProperty('request_id', REQUEST_ID);

      // Verify inference log entry
      const logs = await pg.any<{ model: string; service: string; status: string }>(
        `SELECT model, service, status FROM usage_public.usage_log_inferences WHERE entity_id = $1`,
        [ENTITY_ID],
      );
      expect(logs.length).toBe(1);
      expect(logs[0].model).toBe('nomic-embed-text');
      expect(logs[0].service).toBe('embedding');
      expect(logs[0].status).toBe('success');
    });

    it('returns quotaExceeded when limit is reached', async () => {
      // Set a low credit limit
      await pg.query(
        `INSERT INTO billing_public.meter_credits (entity_id, meter_slug, credit_amount) VALUES ($1, 'nomic-embed-text', 5)`,
        [ENTITY_ID],
      );
      await pg.query(
        `INSERT INTO billing_public.balances (entity_id, meter_slug, balance) VALUES ($1, 'nomic-embed-text', 5)`,
        [ENTITY_ID],
      );

      const ctx = await buildMeteringCtx(pg);
      const result = await meteredEmbed(mockEmbedder, 'hello world', ctx, {
        embeddingMeterSlug: 'nomic-embed-text',
        embeddingModel: 'nomic-embed-text',
      });

      expect(result.metered).toBe(true);
      expect(result.quotaExceeded).toBe(true);
      expect(result.result).toBeNull();

      // Wait for async inference log write
      await new Promise((r) => setTimeout(r, 200));

      // Verify inference log records the quota_exceeded status
      const logs = await pg.any<{ status: string }>(
        `SELECT status FROM usage_public.usage_log_inferences WHERE entity_id = $1`,
        [ENTITY_ID],
      );
      expect(logs.length).toBe(1);
      expect(logs[0].status).toBe('quota_exceeded');
    });

    it('passes through unmetered when no meter slug configured', async () => {
      const ctx = await buildMeteringCtx(pg);
      const result = await meteredEmbed(mockEmbedder, 'hello', ctx, {});

      expect(result.metered).toBe(false);
      expect(result.quotaExceeded).toBe(false);
      expect(result.result).toEqual([1, 0, 0]);
    });

    it('request_id propagates to billing ledger metadata', async () => {
      const custom_request_id = '11111111-1111-1111-1111-111111111111';
      const ctx = await buildMeteringCtx(pg, {
        requestId: custom_request_id,
        pgSettings: {
          'jwt.claims.user_id': ENTITY_ID,
          'jwt.claims.database_id': DATABASE_ID,
          'request.id': custom_request_id,
        },
      });

      await meteredEmbed(mockEmbedder, 'test text', ctx, {
        embeddingMeterSlug: 'nomic-embed-text',
        embeddingModel: 'nomic-embed-text',
      });

      await new Promise((r) => setTimeout(r, 200));

      const ledger = await pg.any<{ metadata: Record<string, unknown> }>(
        `SELECT metadata FROM billing_public.ledger WHERE entity_id = $1`,
        [ENTITY_ID],
      );
      expect(ledger.length).toBe(1);
      expect(ledger[0].metadata).toHaveProperty('request_id', custom_request_id);
    });
  });

  // ===========================================================================
  // 5. Real Ollama E2E — full pipeline with live inference
  //    Skipped when Ollama is not available.
  // ===========================================================================

  const describeOllama = ollamaAvailable ? describe : describe.skip;

  describeOllama('meteredEmbed with real Ollama', () => {
    let embedder: EmbedderFunction;

    beforeAll(() => {
      const built = buildEmbedder({
        provider: 'ollama',
        model: 'nomic-embed-text',
        baseUrl: OLLAMA_BASE_URL,
      });
      if (!built) throw new Error('Failed to build Ollama embedder');
      embedder = built;
    });

    it('embeds text, records usage, and writes inference log', async () => {
      const ctx = await buildMeteringCtx(pg);
      const result = await meteredEmbed(embedder, 'PostgreSQL is a powerful database', ctx, {
        embeddingMeterSlug: 'nomic-embed-text',
        embeddingModel: 'nomic-embed-text',
        provider: 'ollama',
      });

      expect(result.metered).toBe(true);
      expect(result.quotaExceeded).toBe(false);
      expect(result.result).not.toBeNull();
      expect(Array.isArray(result.result)).toBe(true);
      expect(result.result!.length).toBeGreaterThan(0);
      expect(result.latencyMs).toBeGreaterThan(0);

      // Wait for async billing writes
      await new Promise((r) => setTimeout(r, 500));

      // Verify billing ledger
      const ledger = await pg.any<{ meter_slug: string; amount: string; metadata: Record<string, unknown> }>(
        `SELECT meter_slug, amount, metadata FROM billing_public.ledger WHERE entity_id = $1`,
        [ENTITY_ID],
      );
      expect(ledger.length).toBe(1);
      expect(ledger[0].meter_slug).toBe('nomic-embed-text');
      expect(Number(ledger[0].amount)).toBeGreaterThan(0);
      expect(ledger[0].metadata).toHaveProperty('request_id', REQUEST_ID);
      expect(ledger[0].metadata).toHaveProperty('dims');
      expect(ledger[0].metadata).toHaveProperty('latency_ms');

      // Verify inference log
      const logs = await pg.any<{
        model: string;
        provider: string;
        service: string;
        operation: string;
        status: string;
        input_tokens: string;
        total_tokens: string;
        latency_ms: string;
        embedding_model: string;
      }>(
        `SELECT model, provider, service, operation, status,
                input_tokens, total_tokens, latency_ms, embedding_model
         FROM usage_public.usage_log_inferences
         WHERE entity_id = $1`,
        [ENTITY_ID],
      );
      expect(logs.length).toBe(1);
      expect(logs[0].model).toBe('nomic-embed-text');
      expect(logs[0].provider).toBe('ollama');
      expect(logs[0].service).toBe('embedding');
      expect(logs[0].operation).toBe('create');
      expect(logs[0].status).toBe('success');
      expect(Number(logs[0].input_tokens)).toBeGreaterThan(0);
      expect(Number(logs[0].latency_ms)).toBeGreaterThan(0);
      expect(logs[0].embedding_model).toBe('nomic-embed-text');

      // Verify balance was deducted
      const balances = await pg.any<{ balance: string }>(
        `SELECT balance FROM billing_public.balances WHERE entity_id = $1 AND meter_slug = 'nomic-embed-text'`,
        [ENTITY_ID],
      );
      expect(balances.length).toBe(1);
      expect(Number(balances[0].balance)).toBeGreaterThan(0);
    });

    it('quota enforcement blocks real Ollama call', async () => {
      // Exhaust quota
      await pg.query(
        `INSERT INTO billing_public.meter_credits (entity_id, meter_slug, credit_amount) VALUES ($1, 'nomic-embed-text', 1)`,
        [ENTITY_ID],
      );
      await pg.query(
        `INSERT INTO billing_public.balances (entity_id, meter_slug, balance) VALUES ($1, 'nomic-embed-text', 1)`,
        [ENTITY_ID],
      );

      const ctx = await buildMeteringCtx(pg);
      const result = await meteredEmbed(embedder, 'This should be blocked', ctx, {
        embeddingMeterSlug: 'nomic-embed-text',
        embeddingModel: 'nomic-embed-text',
        provider: 'ollama',
      });

      expect(result.quotaExceeded).toBe(true);
      expect(result.result).toBeNull();
    });

    it('multiple metered calls accumulate in balance and ledger', async () => {
      const ctx = await buildMeteringCtx(pg);
      const opts = {
        embeddingMeterSlug: 'nomic-embed-text',
        embeddingModel: 'nomic-embed-text',
        provider: 'ollama',
      };

      await meteredEmbed(embedder, 'First call', ctx, opts);
      await meteredEmbed(embedder, 'Second call', ctx, opts);

      // Wait for async writes
      await new Promise((r) => setTimeout(r, 500));

      const ledger = await pg.any<{ amount: string }>(
        `SELECT amount FROM billing_public.ledger WHERE entity_id = $1 ORDER BY created_at`,
        [ENTITY_ID],
      );
      expect(ledger.length).toBe(2);

      const balance = await pg.any<{ balance: string }>(
        `SELECT balance FROM billing_public.balances WHERE entity_id = $1 AND meter_slug = 'nomic-embed-text'`,
        [ENTITY_ID],
      );
      expect(Number(balance[0].balance)).toBe(
        Number(ledger[0].amount) + Number(ledger[1].amount),
      );

      // Inference log should have 2 entries
      const logs = await pg.any(
        `SELECT id FROM usage_public.usage_log_inferences WHERE entity_id = $1`,
        [ENTITY_ID],
      );
      expect(logs.length).toBe(2);
    });
  });
});
