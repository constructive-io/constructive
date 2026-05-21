/**
 * LLM API Router
 *
 * Express router providing REST streaming endpoints for AI agent conversations.
 * Uses the agent tables (agent_thread, agent_message) discovered from the
 * agent_chat_module config table at runtime.
 *
 * Hybrid architecture:
 *   - GraphQL handles CRUD (threads, messages, tasks) via PostGraphile
 *   - REST handles SSE streaming for chat completions (what GraphQL can't do)
 *
 * Routes (entity-scoped):
 *   POST /v1/orgs/:entity_id/threads                    → create thread
 *   POST /v1/orgs/:entity_id/threads/:thread_id/messages → send message + stream response
 *
 * Routes (global — bills to actor_id from JWT):
 *   POST /v1/threads                    → create thread (entity_id = user_id)
 *   POST /v1/threads/:thread_id/messages → send message + stream response
 *
 * Auth: JWT from the auth middleware (req.token) → pg SET LOCAL context for RLS
 * Metering: check_billing_quota → LLM call → record_usage with real token counts
 */

import express, { Router, Request, Response } from 'express';
import { Logger } from '@pgpmjs/logger';
import { Pool } from 'pg';
import { getPgPool } from 'pg-cache';
import OllamaClient from '@agentic-kit/ollama';
import { ModuleConfigCache } from 'graphile-cache';
import {
  getLlmEnvOptions,
  getAgentDiscovery,
  getLlmBillingConfig,
} from 'graphile-llm';
import type { AgentDiscovery, BillingConfig } from 'graphile-llm';

const log = new Logger('llm-api');

// ─── Types ──────────────────────────────────────────────────────────────────

interface ThreadRow {
  id: string;
  mode: string;
  model: string | null;
  system_prompt: string | null;
  status: string;
}

interface MessageRow {
  id: string;
  author_role: string;
  parts: any;
  created_at: string;
}

interface CreateThreadBody {
  mode?: string;
  model?: string;
  system_prompt?: string;
  title?: string;
}

interface SendMessageBody {
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  model?: string;
  temperature?: number;
  stream?: boolean;
}

/**
 * Placeholder: replace with actual provider token counts once generateWithUsage() is approved.
 * Estimates ~4 chars per token for English text.
 */
function placeholderAmountTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Call generate() and estimate token counts from text length.
 * When a provider-native token counting API is approved, swap the
 * estimation logic here without changing call sites.
 */
async function callWithUsage(
  client: OllamaClient,
  input: { model: string; messages: any; stream?: boolean; temperature?: number },
  onChunk?: (chunk: string) => void,
): Promise<{ content: string; usage: { input: number; output: number; totalTokens: number } }> {
  const promptText = input.messages.map((m: any) => m.content).join(' ');
  let content: string;
  if (onChunk || input.stream) {
    await client.generate(input, onChunk!);
    content = '';
  } else {
    content = await client.generate(input);
  }

  const inputTokens = placeholderAmountTokens(promptText);
  const outputTokens = placeholderAmountTokens(content);
  return {
    content,
    usage: { input: inputTokens, output: outputTokens, totalTokens: inputTokens + outputTokens },
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getPgSettings(req: Request): Record<string, string> {
  const settings: Record<string, string> = {};

  if (req.token?.user_id) {
    settings['jwt.claims.user_id'] = req.token.user_id;
    settings['role'] = 'authenticated';
  }
  if (req.databaseId) {
    settings['jwt.claims.database_id'] = req.databaseId;
  }
  if (req.requestId) {
    settings['request.id'] = req.requestId;
  }

  return settings;
}

async function withRlsClient<T>(
  pool: Pool,
  pgSettings: Record<string, string>,
  fn: (client: any) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const [key, value] of Object.entries(pgSettings)) {
      await client.query('SELECT set_config($1, $2, true)', [key, value]);
    }
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

function resolveOllamaClient(): { client: OllamaClient; model: string } | null {
  const { chat } = getLlmEnvOptions();

  if (chat.provider === 'ollama') {
    return {
      client: new OllamaClient(chat.baseUrl),
      model: chat.model,
    };
  }

  return null;
}

// ─── Billing Helpers ────────────────────────────────────────────────────────

async function checkQuota(
  pool: Pool,
  pgSettings: Record<string, string>,
  billing: BillingConfig,
  entityId: string,
  meterSlug: string,
): Promise<boolean> {
  try {
    return await withRlsClient(pool, pgSettings, async (client) => {
      const sql = `SELECT "${billing.privateSchema}"."${billing.checkBillingQuotaFunction}"($1, $2::uuid, $3) AS allowed`;
      const result = await client.query(sql, [meterSlug, entityId, 1]);
      return result.rows[0]?.allowed !== false;
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    log.warn(`[llm-api] check_billing_quota failed (allowing): ${message}`);
    return true;
  }
}

async function recordUsage(
  pool: Pool,
  pgSettings: Record<string, string>,
  billing: BillingConfig,
  entityId: string,
  meterSlug: string,
  amount: number,
  metadata: Record<string, unknown>,
): Promise<void> {
  try {
    await withRlsClient(pool, pgSettings, async (client) => {
      const sql = `SELECT "${billing.privateSchema}"."${billing.recordUsageFunction}"($1, $2::uuid, $3, $4::jsonb)`;
      await client.query(sql, [meterSlug, entityId, amount, JSON.stringify(metadata)]);
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    log.warn(`[llm-api] record_usage failed (non-fatal): ${message}`);
  }
}

async function resolveBilling(
  pool: Pool,
  pgSettings: Record<string, string>,
  databaseId: string,
): Promise<BillingConfig | null> {
  try {
    let billing: BillingConfig | null = null;
    await withRlsClient(pool, pgSettings, async (client) => {
      const entry = await getLlmBillingConfig(client, databaseId);
      billing = entry.billing;
    });
    return billing;
  } catch {
    return null;
  }
}

// ─── Inference Logging ──────────────────────────────────────────────────────

interface InferenceLogInfo {
  schemaName: string;
  tableName: string;
}

const INFERENCE_LOG_DISCOVERY_SQL = `
  SELECT s.schema_name, ilm.inference_log_table_name
  FROM metaschema_modules_public.inference_log_module ilm
  JOIN metaschema_public.schema s ON s.id = ilm.schema_id
  LIMIT 1
`;

const inferenceLogCache = new ModuleConfigCache<InferenceLogInfo | null>({
  name: 'inference-log',
  ttlMs: 60_000,
});

async function getInferenceLogInfo(pool: Pool, dbname: string): Promise<InferenceLogInfo | null> {
  const cached = inferenceLogCache.get(dbname);
  if (cached !== undefined) return cached;

  let info: InferenceLogInfo | null = null;
  try {
    const { rows } = await pool.query(INFERENCE_LOG_DISCOVERY_SQL);
    if (rows.length > 0) {
      info = {
        schemaName: rows[0].schema_name,
        tableName: rows[0].inference_log_table_name,
      };
    }
  } catch {
    // Module not provisioned
  }

  inferenceLogCache.set(dbname, info);
  return info;
}

async function logInference(
  pool: Pool,
  pgSettings: Record<string, string>,
  logInfo: InferenceLogInfo,
  data: {
    entityId: string;
    actorId: string;
    model: string;
    provider: string;
    requestType: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    latencyMs: number;
    status: string;
  },
): Promise<void> {
  try {
    await withRlsClient(pool, pgSettings, async (client) => {
      await client.query(
        `INSERT INTO "${logInfo.schemaName}"."${logInfo.tableName}"
         (entity_id, actor_id, model, provider, request_type, input_tokens, output_tokens, total_tokens, latency_ms, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          data.entityId,
          data.actorId,
          data.model,
          data.provider,
          data.requestType,
          data.inputTokens,
          data.outputTokens,
          data.totalTokens,
          data.latencyMs,
          data.status,
        ],
      );
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    log.warn(`[llm-api] inference log INSERT failed (non-fatal): ${message}`);
  }
}

// ─── Route Handlers ─────────────────────────────────────────────────────────

async function handleCreateThread(
  req: Request,
  res: Response,
  entityId: string,
): Promise<void> {
  if (!req.token?.user_id) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const dbname = req.api?.dbname;
  if (!dbname) {
    res.status(400).json({ error: 'Database not resolved' });
    return;
  }

  const pool = getPgPool({ database: dbname });
  const discovery = await getAgentDiscovery(pool, dbname);
  if (!discovery?.thread) {
    res.status(404).json({ error: 'Agent module not provisioned for this database' });
    return;
  }

  const body: CreateThreadBody = req.body || {};
  const { thread } = discovery;
  const pgSettings = getPgSettings(req);

  const result = await withRlsClient(pool, pgSettings, async (client) => {
    const { rows } = await client.query(
      `INSERT INTO "${thread.schemaName}"."${thread.tableName}"
       (entity_id, owner_id, mode, model, system_prompt, title)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, mode, model, system_prompt, status, created_at`,
      [
        entityId,
        req.token!.user_id,
        body.mode ?? 'ask',
        body.model ?? null,
        body.system_prompt ?? null,
        body.title ?? null,
      ],
    );
    return rows[0];
  });

  res.status(201).json({
    id: result.id,
    mode: result.mode,
    model: result.model,
    system_prompt: result.system_prompt,
    status: result.status,
    created_at: result.created_at,
  });
}

async function handleSendMessage(
  req: Request,
  res: Response,
  entityId: string,
): Promise<void> {
  if (!req.token?.user_id) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const dbname = req.api?.dbname;
  if (!dbname) {
    res.status(400).json({ error: 'Database not resolved' });
    return;
  }

  const pool = getPgPool({ database: dbname });
  const discovery = await getAgentDiscovery(pool, dbname);
  if (!discovery?.thread || !discovery?.message) {
    res.status(404).json({ error: 'Agent module not provisioned for this database' });
    return;
  }

  const body: SendMessageBody = req.body || {};
  if (!body.messages?.length) {
    res.status(400).json({ error: 'messages[] is required and must not be empty' });
    return;
  }

  const { thread, message: msgTable } = discovery;
  const pgSettings = getPgSettings(req);
  const threadId = req.params.thread_id;
  const userId = req.token.user_id;
  const databaseId = req.databaseId;

  // 1. Verify thread exists and user owns it (RLS enforced)
  const threadRow = await withRlsClient(pool, pgSettings, async (client) => {
    const { rows } = await client.query(
      `SELECT id, mode, model, system_prompt, status
       FROM "${thread.schemaName}"."${thread.tableName}"
       WHERE id = $1`,
      [threadId],
    );
    return rows[0] as ThreadRow | undefined;
  });

  if (!threadRow) {
    res.status(404).json({ error: 'Thread not found' });
    return;
  }

  // 2. Resolve billing config + inference log discovery
  const billing = databaseId
    ? await resolveBilling(pool, pgSettings, databaseId)
    : null;
  const inferenceLog = await getInferenceLogInfo(pool, dbname);

  const ollama = resolveOllamaClient();
  if (!ollama) {
    res.status(503).json({ error: 'No LLM provider configured' });
    return;
  }

  const model = body.model ?? threadRow.model ?? ollama.model;
  const meterSlug = model;

  if (billing) {
    const allowed = await checkQuota(pool, pgSettings, billing, entityId, meterSlug);
    if (!allowed) {
      res.status(429).json({
        error: 'Token quota exceeded',
        meter: meterSlug,
        entity_id: entityId,
      });
      return;
    }
  }

  // 3. Persist user message(s)
  await withRlsClient(pool, pgSettings, async (client) => {
    for (const msg of body.messages) {
      if (msg.role === 'user') {
        await client.query(
          `INSERT INTO "${msgTable.schemaName}"."${msgTable.tableName}"
           (thread_id, owner_id, entity_id, author_role, parts)
           VALUES ($1, $2, (SELECT entity_id FROM "${thread.schemaName}"."${thread.tableName}" WHERE id = $1), $3, $4)`,
          [
            threadId,
            userId,
            'user',
            JSON.stringify([{ type: 'text', text: msg.content }]),
          ],
        );
      }
    }
  });

  // 4. Load full thread history for context
  const history = await withRlsClient(pool, pgSettings, async (client) => {
    const { rows } = await client.query(
      `SELECT author_role, parts, created_at
       FROM "${msgTable.schemaName}"."${msgTable.tableName}"
       WHERE thread_id = $1
       ORDER BY created_at ASC`,
      [threadId],
    );
    return rows as MessageRow[];
  });

  const llmMessages: Array<{ role: string; content: string }> = [];
  const systemPrompt = threadRow.system_prompt;
  if (systemPrompt) {
    llmMessages.push({ role: 'system', content: systemPrompt });
  }
  for (const row of history) {
    const parts = Array.isArray(row.parts) ? row.parts : [];
    const textContent = parts
      .filter((p: any) => p.type === 'text')
      .map((p: any) => p.text)
      .join('');
    if (textContent) {
      llmMessages.push({
        role: row.author_role === 'user' ? 'user' : 'assistant',
        content: textContent,
      });
    }
  }

  // 5. Call LLM with token usage tracking
  const shouldStream = body.stream !== false;
  const startTime = Date.now();

  if (shouldStream) {
    // ── SSE Streaming ──────────────────────────────────────────────────
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const messageId = `msg_${Date.now()}`;

    try {
      let streamedContent = '';
      const result = await callWithUsage(
        ollama.client,
        {
          model,
          messages: llmMessages as any,
          stream: true,
          temperature: body.temperature,
        },
        (chunk: string) => {
          streamedContent += chunk;
          const event = {
            id: messageId,
            choices: [{
              index: 0,
              delta: { content: chunk, role: 'assistant' },
              finish_reason: null as string | null,
            }],
            model,
          };
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        },
      );
      // Streaming generate() returns void; use accumulated chunks
      const content = streamedContent;
      const promptText = llmMessages.map(m => m.content).join(' ');
      const latencyMs = Date.now() - startTime;
      const inputTokens = placeholderAmountTokens(promptText);
      const outputTokens = placeholderAmountTokens(content);
      const totalTokens = inputTokens + outputTokens;

      // Send [DONE] marker
      res.write('data: [DONE]\n\n');
      res.end();

      // 6. Persist assistant message with model (fire-and-forget)
      if (content) {
        withRlsClient(pool, pgSettings, async (client) => {
          await client.query(
            `INSERT INTO "${msgTable.schemaName}"."${msgTable.tableName}"
             (thread_id, owner_id, entity_id, author_role, parts, model)
             VALUES ($1, $2, (SELECT entity_id FROM "${thread.schemaName}"."${thread.tableName}" WHERE id = $1), $3, $4, $5)`,
            [
              threadId,
              userId,
              'assistant',
              JSON.stringify([{ type: 'text', text: content }]),
              model,
            ],
          );
        }).catch((err) => {
          log.error('[llm-api] Failed to persist assistant message:', err);
        });
      }

      // 7. Record billing usage (fire-and-forget)
      if (billing && totalTokens > 0) {
        recordUsage(pool, pgSettings, billing, entityId, meterSlug, totalTokens, {
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          model,
          latency_ms: latencyMs,
          stream: true,
        }).catch(() => {});
      }

      // 8. Inference log (fire-and-forget)
      if (inferenceLog) {
        logInference(pool, pgSettings, inferenceLog, {
          entityId,
          actorId: userId,
          model,
          provider: 'ollama',
          requestType: 'chat',
          inputTokens,
          outputTokens,
          totalTokens,
          latencyMs,
          status: 'ok',
        }).catch(() => {});
      }
    } catch (streamErr: any) {
      log.error('[llm-api] Streaming error:', streamErr);
      const errorEvent = { error: { message: streamErr.message, type: 'stream_error' } };
      res.write(`data: ${JSON.stringify(errorEvent)}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  } else {
    // ── Non-streaming (batch) ──────────────────────────────────────────
    const result = await callWithUsage(ollama.client, {
      model,
      messages: llmMessages as any,
      stream: false,
      temperature: body.temperature,
    });

    const latencyMs = Date.now() - startTime;
    const inputTokens = result.usage.input;
    const outputTokens = result.usage.output;
    const totalTokens = result.usage.totalTokens;

    // Persist assistant message with model
    await withRlsClient(pool, pgSettings, async (client) => {
      await client.query(
        `INSERT INTO "${msgTable.schemaName}"."${msgTable.tableName}"
         (thread_id, owner_id, entity_id, author_role, parts, model)
         VALUES ($1, $2, (SELECT entity_id FROM "${thread.schemaName}"."${thread.tableName}" WHERE id = $1), $3, $4, $5)`,
        [
          threadId,
          userId,
          'assistant',
          JSON.stringify([{ type: 'text', text: result.content }]),
          model,
        ],
      );
    });

    // Record billing usage
    if (billing && totalTokens > 0) {
      recordUsage(pool, pgSettings, billing, entityId, meterSlug, totalTokens, {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        model,
        latency_ms: latencyMs,
        stream: false,
      }).catch(() => {});
    }

    // Inference log
    if (inferenceLog) {
      logInference(pool, pgSettings, inferenceLog, {
        entityId,
        actorId: userId,
        model,
        provider: 'ollama',
        requestType: 'chat',
        inputTokens,
        outputTokens,
        totalTokens,
        latencyMs,
        status: 'ok',
      }).catch(() => {});
    }

    res.json({
      id: `msg_${Date.now()}`,
      choices: [{
        index: 0,
        message: { role: 'assistant', content: result.content },
        finish_reason: 'stop',
      }],
      model,
      usage: {
        prompt_tokens: inputTokens,
        completion_tokens: outputTokens,
        total_tokens: totalTokens,
      },
    });
  }
}

// ─── Router Factory ─────────────────────────────────────────────────────────

export function createLlmApiRouter(): Router {
  const router = Router();

  router.use(express.json());

  // ── Entity-scoped routes ─────────────────────────────────────────────────

  router.post('/v1/orgs/:entity_id/threads', async (req: Request, res: Response) => {
    try {
      await handleCreateThread(req, res, req.params.entity_id);
    } catch (err: any) {
      log.error('[llm-api] Error creating thread:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  router.post(
    '/v1/orgs/:entity_id/threads/:thread_id/messages',
    async (req: Request, res: Response) => {
      try {
        await handleSendMessage(req, res, req.params.entity_id);
      } catch (err: any) {
        log.error('[llm-api] Error in messages endpoint:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Internal server error' });
        }
      }
    },
  );

  // ── Global routes (no entity_id — bills to actor_id from JWT) ────────────

  router.post('/v1/threads', async (req: Request, res: Response) => {
    try {
      const userId = req.token?.user_id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      await handleCreateThread(req, res, userId);
    } catch (err: any) {
      log.error('[llm-api] Error creating thread:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  router.post(
    '/v1/threads/:thread_id/messages',
    async (req: Request, res: Response) => {
      try {
        const userId = req.token?.user_id;
        if (!userId) {
          res.status(401).json({ error: 'Authentication required' });
          return;
        }
        await handleSendMessage(req, res, userId);
      } catch (err: any) {
        log.error('[llm-api] Error in messages endpoint:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Internal server error' });
        }
      }
    },
  );

  return router;
}
