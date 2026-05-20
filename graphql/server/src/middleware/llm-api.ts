/**
 * LLM API Router
 *
 * Express router providing a REST streaming endpoint for AI agent conversations.
 * Uses the agent tables (agent_thread, agent_message) discovered by
 * LlmAgentDiscoveryPlugin via smart tags.
 *
 * Hybrid architecture:
 *   - GraphQL handles CRUD (threads, messages, tasks) via PostGraphile
 *   - REST handles SSE streaming for chat completions (what GraphQL can't do)
 *
 * Routes:
 *   POST /orgs/:entity_id/threads                    → create thread
 *   POST /orgs/:entity_id/threads/:thread_id/messages → send message + stream response
 *
 * Auth: JWT from the auth middleware (req.token) → pg SET LOCAL context for RLS
 * Metering: TODO v2 — integrate with meteredChat
 */

import express, { Router, Request, Response } from 'express';
import { Logger } from '@pgpmjs/logger';
import { Pool } from 'pg';
import { getPgPool } from 'pg-cache';
import OllamaClient from '@agentic-kit/ollama';
import { getLlmEnvOptions } from 'graphile-llm';
import type { AgentDiscovery } from 'graphile-llm';

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

// ─── Router Factory ─────────────────────────────────────────────────────────

/**
 * Creates the LLM API router.
 *
 * @param getDiscovery - Function to look up agent discovery by dbname.
 *                       Typically imported from graphile-llm's agent-discovery-plugin.
 */
export function createLlmApiRouter(
  getDiscovery: (dbname: string) => AgentDiscovery | null,
): Router {
  const router = Router();

  // JSON body parsing scoped to this router
  router.use(express.json());

  // ── POST /orgs/:entity_id/threads ────────────────────────────────────────

  router.post('/orgs/:entity_id/threads', async (req: Request, res: Response) => {
    try {
      if (!req.token?.user_id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const dbname = req.api?.dbname;
      if (!dbname) {
        res.status(400).json({ error: 'Database not resolved' });
        return;
      }

      const discovery = getDiscovery(dbname);
      if (!discovery?.thread) {
        res.status(404).json({ error: 'Agent module not provisioned for this database' });
        return;
      }

      const body: CreateThreadBody = req.body || {};
      const { thread } = discovery;
      const pool = getPgPool({ database: dbname });
      const pgSettings = getPgSettings(req);
      const entityId = req.params.entity_id;

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
    } catch (err: any) {
      log.error('[llm-api] Error creating thread:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ── POST /orgs/:entity_id/threads/:thread_id/messages ────────────────────

  router.post(
    '/orgs/:entity_id/threads/:thread_id/messages',
    async (req: Request, res: Response) => {
      try {
        if (!req.token?.user_id) {
          res.status(401).json({ error: 'Authentication required' });
          return;
        }

        const dbname = req.api?.dbname;
        if (!dbname) {
          res.status(400).json({ error: 'Database not resolved' });
          return;
        }

        const discovery = getDiscovery(dbname);
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
        const pool = getPgPool({ database: dbname });
        const pgSettings = getPgSettings(req);
        const threadId = req.params.thread_id;
        const userId = req.token.user_id;

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

        // 2. Persist the user message(s)
        const lastUserMsg = body.messages[body.messages.length - 1];
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

        // 3. Load full thread history for context
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

        // Build messages array for the LLM
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

        // 4. Resolve LLM client
        const ollama = resolveOllamaClient();
        if (!ollama) {
          res.status(503).json({ error: 'No LLM provider configured' });
          return;
        }

        const model = body.model ?? threadRow.model ?? ollama.model;
        const shouldStream = body.stream !== false; // default: true

        if (shouldStream) {
          // ── SSE Streaming ──────────────────────────────────────────────
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
          });

          const responseChunks: string[] = [];
          const messageId = `msg_${Date.now()}`;

          try {
            await ollama.client.generate(
              {
                model,
                messages: llmMessages as any,
                stream: true,
                temperature: body.temperature,
              },
              (chunk: string) => {
                responseChunks.push(chunk);
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
          } catch (streamErr: any) {
            log.error('[llm-api] Streaming error:', streamErr);
            const errorEvent = { error: { message: streamErr.message, type: 'stream_error' } };
            res.write(`data: ${JSON.stringify(errorEvent)}\n\n`);
          }

          // Send [DONE] marker
          res.write('data: [DONE]\n\n');
          res.end();

          // 5. Persist assistant response (fire-and-forget, after stream ends)
          const fullResponse = responseChunks.join('');
          if (fullResponse) {
            withRlsClient(pool, pgSettings, async (client) => {
              await client.query(
                `INSERT INTO "${msgTable.schemaName}"."${msgTable.tableName}"
                 (thread_id, owner_id, entity_id, author_role, parts)
                 VALUES ($1, $2, (SELECT entity_id FROM "${thread.schemaName}"."${thread.tableName}" WHERE id = $1), $3, $4)`,
                [
                  threadId,
                  userId,
                  'assistant',
                  JSON.stringify([{ type: 'text', text: fullResponse }]),
                ],
              );
            }).catch((err) => {
              log.error('[llm-api] Failed to persist assistant message:', err);
            });
          }
        } else {
          // ── Non-streaming (batch) ──────────────────────────────────────
          const response = await ollama.client.generate({
            model,
            messages: llmMessages as any,
            stream: false,
            temperature: body.temperature,
          });

          // Persist assistant response
          await withRlsClient(pool, pgSettings, async (client) => {
            await client.query(
              `INSERT INTO "${msgTable.schemaName}"."${msgTable.tableName}"
               (thread_id, owner_id, entity_id, author_role, parts)
               VALUES ($1, $2, (SELECT entity_id FROM "${thread.schemaName}"."${thread.tableName}" WHERE id = $1), $3, $4)`,
              [
                threadId,
                userId,
                'assistant',
                JSON.stringify([{ type: 'text', text: response }]),
              ],
            );
          });

          res.json({
            id: `msg_${Date.now()}`,
            choices: [{
              index: 0,
              message: { role: 'assistant', content: response },
              finish_reason: 'stop',
            }],
            model,
          });
        }
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
