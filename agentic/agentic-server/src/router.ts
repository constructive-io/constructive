/**
 * router — Express router for the agentic-server
 *
 * Provides REST endpoints for AI agent conversations:
 *
 *   POST /v1/threads                             → create thread
 *   POST /v1/threads/:thread_id/messages         → send message + stream response
 *   POST /v1/orgs/:entity_id/threads             → create thread (entity-scoped)
 *   POST /v1/orgs/:entity_id/threads/:thread_id/messages → send message (entity-scoped)
 *   POST /v1/embed                               → generate embedding
 *
 * All routes require `req.constructive` (from @constructive-io/express-context).
 * Billing (check_quota + record_usage) and inference logging are automatic
 * when the billing/inference_log modules are provisioned.
 *
 * LLM provider config is resolved per-database via `ctx.useLlm()` from the
 * llm_module table, falling back to env vars (EMBEDDER_*, CHAT_*) when the
 * module is not provisioned.
 */

import { OllamaAdapter } from '@agentic-kit/ollama';
import type { BillingClient, LlmConfig } from '@constructive-io/express-context';
import { Logger } from '@pgpmjs/logger';
import express, { Request, Response,Router } from 'express';

import { getEnvOptions as getLlmEnvOptions } from '@constructive-io/llm-env';

const log = new Logger('agentic-server');

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

interface EmbedBody {
  input: string | string[];
  model?: string;
}

interface UsageResult {
  input: number;
  output: number;
  reasoning: number;
  cacheRead: number;
  cacheWrite: number;
  totalTokens: number;
}

// ─── Resolved LLM Config ────────────────────────────────────────────────────

interface ResolvedChatAdapter {
  adapter: OllamaAdapter;
  model: string;
  baseUrl: string;
  provider: string;
}

interface ResolvedEmbeddingAdapter {
  adapter: OllamaAdapter;
  model: string;
  provider: string;
}

function resolveChatAdapter(llm: LlmConfig | null): ResolvedChatAdapter | null {
  const provider = llm?.chatProvider ?? getLlmEnvOptions().chat.provider;
  const model = llm?.chatModel ?? getLlmEnvOptions().chat.model;
  const baseUrl = llm?.chatBaseUrl ?? getLlmEnvOptions().chat.baseUrl;

  if (provider === 'ollama') {
    return { adapter: new OllamaAdapter(baseUrl), model, baseUrl, provider };
  }
  return null;
}

function resolveEmbeddingAdapter(llm: LlmConfig | null): ResolvedEmbeddingAdapter | null {
  const provider = llm?.embeddingProvider ?? getLlmEnvOptions().embedding.provider;
  const model = llm?.embeddingModel ?? getLlmEnvOptions().embedding.model;
  const baseUrl = llm?.embeddingBaseUrl ?? getLlmEnvOptions().embedding.baseUrl;

  if (provider === 'ollama') {
    return { adapter: new OllamaAdapter(baseUrl), model, provider };
  }
  return null;
}

// ─── Route Handlers ─────────────────────────────────────────────────────────

async function handleCreateThread(
  req: Request,
  res: Response,
  entityId: string
): Promise<void> {
  const ctx = req.constructive;
  if (!ctx?.userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const agentChat = await ctx.useModule('agentChat');
  if (!agentChat?.threadTableName) {
    res.status(404).json({ error: 'Agent module not provisioned for this database' });
    return;
  }

  const body: CreateThreadBody = req.body || {};
  const { schemaName, threadTableName } = agentChat;

  const result = await ctx.withPgClient(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO "${schemaName}"."${threadTableName}"
       (entity_id, owner_id, mode, model, system_prompt, title)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, mode, model, system_prompt, status, created_at`,
      [
        entityId,
        ctx.userId,
        body.mode ?? 'ask',
        body.model ?? null,
        body.system_prompt ?? null,
        body.title ?? null
      ]
    );
    return rows[0];
  });

  res.status(201).json({
    id: result.id,
    mode: result.mode,
    model: result.model,
    system_prompt: result.system_prompt,
    status: result.status,
    created_at: result.created_at
  });
}

async function handleSendMessage(
  req: Request,
  res: Response,
  entityId: string
): Promise<void> {
  const ctx = req.constructive;
  if (!ctx?.userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const agentChat = await ctx.useModule('agentChat');
  if (!agentChat?.threadTableName || !agentChat?.messageTableName) {
    res.status(404).json({ error: 'Agent module not provisioned for this database' });
    return;
  }

  const body: SendMessageBody = req.body || {};
  if (!body.messages?.length) {
    res.status(400).json({ error: 'messages[] is required and must not be empty' });
    return;
  }

  const { schemaName, threadTableName, messageTableName } = agentChat;
  const threadId = req.params.thread_id;
  const userId = ctx.userId;

  // Verify thread exists (RLS enforced)
  const threadRow = await ctx.withPgClient(async (client) => {
    const { rows } = await client.query(
      `SELECT id, mode, model, system_prompt, status
       FROM "${schemaName}"."${threadTableName}"
       WHERE id = $1`,
      [threadId]
    );
    return rows[0] as ThreadRow | undefined;
  });

  if (!threadRow) {
    res.status(404).json({ error: 'Thread not found' });
    return;
  }

  // Resolve shared billing client and LLM config (lazy, cached per request)
  const [billing, llm] = await Promise.all([ctx.useBilling(), ctx.useLlm()]);

  const chatAdapter = resolveChatAdapter(llm);
  if (!chatAdapter) {
    res.status(503).json({ error: 'No LLM provider configured' });
    return;
  }

  const model = body.model ?? threadRow.model ?? chatAdapter.model;
  const meterSlug = model;

  // Quota check
  if (billing) {
    const allowed = await billing.checkQuota(meterSlug);
    if (!allowed) {
      res.status(429).json({
        error: 'Token quota exceeded',
        meter: meterSlug,
        entity_id: entityId
      });
      return;
    }
  }

  // Persist user messages
  await ctx.withPgClient(async (client) => {
    for (const msg of body.messages) {
      if (msg.role === 'user') {
        await client.query(
          `INSERT INTO "${schemaName}"."${messageTableName}"
           (thread_id, owner_id, entity_id, author_role, parts)
           VALUES ($1, $2, (SELECT entity_id FROM "${schemaName}"."${threadTableName}" WHERE id = $1), $3, $4)`,
          [threadId, userId, 'user', JSON.stringify([{ type: 'text', text: msg.content }])]
        );
      }
    }
  });

  // Load full thread history
  const history = await ctx.withPgClient(async (client) => {
    const { rows } = await client.query(
      `SELECT author_role, parts, created_at
       FROM "${schemaName}"."${messageTableName}"
       WHERE thread_id = $1
       ORDER BY created_at ASC`,
      [threadId]
    );
    return rows as MessageRow[];
  });

  const llmMessages: Array<{ role: string; content: string }> = [];
  if (threadRow.system_prompt) {
    llmMessages.push({ role: 'system', content: threadRow.system_prompt });
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
        content: textContent
      });
    }
  }

  const startTime = Date.now();
  const shouldStream = body.stream !== false;

  if (shouldStream) {
    await handleStreamingResponse(req, res, {
      ctx, chatAdapter, model, llmMessages, body,
      entityId, userId, threadId,
      schemaName, threadTableName, messageTableName,
      billing, startTime, meterSlug
    });
  } else {
    await handleBatchResponse(req, res, {
      ctx, chatAdapter, model, llmMessages, body,
      entityId, userId, threadId,
      schemaName, threadTableName, messageTableName,
      billing, startTime, meterSlug
    });
  }
}

interface MessageContext {
  ctx: NonNullable<Request['constructive']>;
  chatAdapter: ResolvedChatAdapter;
  model: string;
  llmMessages: Array<{ role: string; content: string }>;
  body: SendMessageBody;
  entityId: string;
  userId: string;
  threadId: string;
  schemaName: string;
  threadTableName: string;
  messageTableName: string;
  billing: BillingClient | null;
  startTime: number;
  meterSlug: string;
}

async function handleStreamingResponse(
  _req: Request,
  res: Response,
  mc: MessageContext
): Promise<void> {
  const { ctx, chatAdapter, model, llmMessages, body, entityId, userId, threadId, schemaName, threadTableName, messageTableName, billing, startTime, meterSlug } = mc;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  const messageId = `msg_${Date.now()}`;

  try {
    const systemMsg = llmMessages.find(m => m.role === 'system');
    const nonSystem = llmMessages.filter(m => m.role !== 'system');
    const modelDesc = chatAdapter.adapter.createModel(model, { maxOutputTokens: undefined });
    const context = {
      systemPrompt: systemMsg?.content,
      messages: nonSystem.map((m) => ({
        role: m.role as 'user',
        content: m.content,
        timestamp: Date.now()
      }))
    };
    const stream = chatAdapter.adapter.stream(modelDesc, context, {
      temperature: body.temperature
    });

    let streamedContent = '';
    for await (const event of stream) {
      if (event.type === 'text_delta') {
        streamedContent += event.delta;
        const sseEvent = {
          id: messageId,
          choices: [{
            index: 0,
            delta: { content: event.delta, role: 'assistant' },
            finish_reason: null as string | null
          }],
          model
        };
        res.write(`data: ${JSON.stringify(sseEvent)}\n\n`);
      }
    }

    const result = await stream.result();
    const content = streamedContent;
    const latencyMs = Date.now() - startTime;
    const usage: UsageResult = {
      input: result.usage.input,
      output: result.usage.output,
      reasoning: result.usage.reasoning,
      cacheRead: result.usage.cacheRead,
      cacheWrite: result.usage.cacheWrite,
      totalTokens: result.usage.totalTokens
    };

    res.write('data: [DONE]\n\n');
    res.end();

    // Persist assistant message (fire-and-forget)
    if (content) {
      ctx.withPgClient(async (client) => {
        await client.query(
          `INSERT INTO "${schemaName}"."${messageTableName}"
           (thread_id, owner_id, entity_id, author_role, parts, model)
           VALUES ($1, $2, (SELECT entity_id FROM "${schemaName}"."${threadTableName}" WHERE id = $1), $3, $4, $5)`,
          [threadId, userId, 'assistant', JSON.stringify([{ type: 'text', text: content }]), model]
        );
      }).catch((err) => log.error('Failed to persist assistant message:', err));
    }

    // Record billing usage + inference log (fire-and-forget)
    if (billing && usage.totalTokens > 0) {
      billing.recordUsage(meterSlug, usage.totalTokens, {
        input_tokens: usage.input,
        output_tokens: usage.output,
        cache_read_tokens: usage.cacheRead,
        cache_write_tokens: usage.cacheWrite,
        model,
        latency_ms: latencyMs,
        stream: true
      }).catch(() => {});

      billing.logInference({
        entityId, actorId: userId, model, provider: chatAdapter.provider,
        service: 'llm', operation: 'chat',
        inputTokens: usage.input, outputTokens: usage.output,
        totalTokens: usage.totalTokens, latencyMs, status: 'ok'
      }).catch(() => {});
    }
  } catch (streamErr: any) {
    log.error('Streaming error:', streamErr);
    const errorEvent = { error: { message: streamErr.message, type: 'stream_error' } };
    res.write(`data: ${JSON.stringify(errorEvent)}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
}

async function handleBatchResponse(
  _req: Request,
  res: Response,
  mc: MessageContext
): Promise<void> {
  const { ctx, chatAdapter, model, llmMessages, body, entityId, userId, threadId, schemaName, threadTableName, messageTableName, billing, startTime, meterSlug } = mc;

  const systemMsg = llmMessages.find(m => m.role === 'system');
  const nonSystem = llmMessages.filter(m => m.role !== 'system');
  const modelDesc = chatAdapter.adapter.createModel(model, { maxOutputTokens: undefined });
  const context = {
    systemPrompt: systemMsg?.content,
    messages: nonSystem.map((m) => ({
      role: m.role as 'user',
      content: m.content,
      timestamp: Date.now()
    }))
  };
  const stream = chatAdapter.adapter.stream(modelDesc, context, {
    temperature: body.temperature
  });

  const result = await stream.result();
  const content = result.content
    .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
    .map((block) => block.text)
    .join('');
  const latencyMs = Date.now() - startTime;
  const usage: UsageResult = {
    input: result.usage.input,
    output: result.usage.output,
    reasoning: result.usage.reasoning,
    cacheRead: result.usage.cacheRead,
    cacheWrite: result.usage.cacheWrite,
    totalTokens: result.usage.totalTokens
  };

  // Persist assistant message
  await ctx.withPgClient(async (client) => {
    await client.query(
      `INSERT INTO "${schemaName}"."${messageTableName}"
       (thread_id, owner_id, entity_id, author_role, parts, model)
       VALUES ($1, $2, (SELECT entity_id FROM "${schemaName}"."${threadTableName}" WHERE id = $1), $3, $4, $5)`,
      [threadId, userId, 'assistant', JSON.stringify([{ type: 'text', text: content }]), model]
    );
  });

  // Record billing + inference log (fire-and-forget)
  if (billing && usage.totalTokens > 0) {
    billing.recordUsage(meterSlug, usage.totalTokens, {
      input_tokens: usage.input,
      output_tokens: usage.output,
      cache_read_tokens: usage.cacheRead,
      cache_write_tokens: usage.cacheWrite,
      model,
      latency_ms: latencyMs,
      stream: false
    }).catch(() => {});

    billing.logInference({
      entityId, actorId: userId, model, provider: chatAdapter.provider,
      service: 'llm', operation: 'chat',
      inputTokens: usage.input, outputTokens: usage.output,
      totalTokens: usage.totalTokens, latencyMs, status: 'ok'
    }).catch(() => {});
  }

  res.json({
    id: `msg_${Date.now()}`,
    choices: [{
      index: 0,
      message: { role: 'assistant', content },
      finish_reason: 'stop'
    }],
    model,
    usage: {
      prompt_tokens: usage.input,
      completion_tokens: usage.output,
      total_tokens: usage.totalTokens
    }
  });
}

// ─── Embedding Handler ──────────────────────────────────────────────────────

async function handleEmbed(req: Request, res: Response): Promise<void> {
  const ctx = req.constructive;
  if (!ctx?.userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const body: EmbedBody = req.body || {};
  if (!body.input) {
    res.status(400).json({ error: 'input is required' });
    return;
  }

  const llm = await ctx.useLlm();
  const embedAdapter = resolveEmbeddingAdapter(llm);
  if (!embedAdapter) {
    res.status(503).json({ error: 'No embedding provider configured' });
    return;
  }

  const model = body.model ?? embedAdapter.model;
  const inputs = Array.isArray(body.input) ? body.input : [body.input];

  // Resolve shared billing client
  const billing = await ctx.useBilling();

  // Quota check
  if (billing) {
    const allowed = await billing.checkQuota(model);
    if (!allowed) {
      res.status(429).json({ error: 'Embedding quota exceeded', meter: model });
      return;
    }
  }

  const startTime = Date.now();

  try {
    const results = await Promise.all(
      inputs.map((text) => embedAdapter.adapter.embed(text, model))
    );

    const latencyMs = Date.now() - startTime;
    const totalTokens = results.reduce((sum, r) => sum + r.promptTokens, 0);

    // Record usage + inference log (fire-and-forget)
    if (billing && totalTokens > 0) {
      billing.recordUsage(model, totalTokens, {
        input_tokens: totalTokens,
        model,
        latency_ms: latencyMs,
        batch_size: inputs.length
      }).catch(() => {});

      billing.logInference({
        entityId: ctx.userId!,
        actorId: ctx.userId!,
        model,
        provider: embedAdapter.provider,
        service: 'embedding',
        operation: 'embed',
        inputTokens: totalTokens,
        outputTokens: 0,
        totalTokens,
        latencyMs,
        status: 'ok'
      }).catch(() => {});
    }

    res.json({
      object: 'list',
      data: results.map((r, i) => ({
        object: 'embedding',
        index: i,
        embedding: r.embedding
      })),
      model,
      usage: {
        prompt_tokens: totalTokens,
        total_tokens: totalTokens
      }
    });
  } catch (err: any) {
    log.error('Embedding error:', err);
    res.status(500).json({ error: err.message ?? 'Embedding failed' });
  }
}

// ─── Router Factory ─────────────────────────────────────────────────────────

export function createAgenticRouter(): Router {
  const router = Router();

  router.use(express.json());

  // Entity-scoped routes
  router.post('/v1/orgs/:entity_id/threads', async (req: Request, res: Response) => {
    try {
      await handleCreateThread(req, res, req.params.entity_id);
    } catch (err: any) {
      log.error('Error creating thread:', err);
      if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/v1/orgs/:entity_id/threads/:thread_id/messages', async (req: Request, res: Response) => {
    try {
      await handleSendMessage(req, res, req.params.entity_id);
    } catch (err: any) {
      log.error('Error in messages endpoint:', err);
      if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Global routes (entity_id = user_id from JWT)
  router.post('/v1/threads', async (req: Request, res: Response) => {
    try {
      const userId = req.constructive?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      await handleCreateThread(req, res, userId);
    } catch (err: any) {
      log.error('Error creating thread:', err);
      if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/v1/threads/:thread_id/messages', async (req: Request, res: Response) => {
    try {
      const userId = req.constructive?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      await handleSendMessage(req, res, userId);
    } catch (err: any) {
      log.error('Error in messages endpoint:', err);
      if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Embedding endpoint
  router.post('/v1/embed', async (req: Request, res: Response) => {
    try {
      await handleEmbed(req, res);
    } catch (err: any) {
      log.error('Error in embed endpoint:', err);
      if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
