/**
 * Router Integration Tests (mocked Ollama + mocked req.constructive)
 *
 * Tests the full HTTP layer of the agentic-server router by mocking:
 *   - OllamaAdapter (no real LLM needed)
 *   - req.constructive (no real database needed)
 *
 * This verifies request validation, error handling, SSE streaming format,
 * billing flow, and response structure without external dependencies.
 */

import express, { NextFunction,Request, Response } from 'express';
import http from 'http';
import supertest from 'supertest';

/** Every context the router handed the chat adapter, in call order. */
const mockStreamContexts: any[] = [];
/** When set, the mock adapter reports this provider failure instead of a reply. */
const mockStreamFailure: { message: string | null } = { message: null };

// Mock OllamaAdapter before importing router
jest.mock('@agentic-kit/ollama', () => {
  class MockOllamaAdapter {
    readonly api = 'ollama-native';
    readonly provider = 'ollama';
    readonly name = 'ollama';

    createModel(modelId: string, overrides?: any) {
      return {
        id: modelId,
        name: modelId,
        api: this.api,
        provider: this.provider,
        baseUrl: 'http://localhost:11434',
        input: ['text', 'image'],
        reasoning: false,
        tools: false,
        ...overrides
      };
    }

    async embed(text: string, model = 'nomic-embed-text') {
      return {
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
        promptTokens: text.split(' ').length
      };
    }

    stream(_model: any, _context: any, _options?: any) {
      mockStreamContexts.push(_context);
      const events: any[] = [];
      let resultResolve: (val: any) => void;
      const resultPromise = new Promise((resolve) => { resultResolve = resolve; });

      // Simulate streaming events
      const failure = mockStreamFailure.message;
      setTimeout(() => {
        if (failure) return;
        events.push({ type: 'text_delta', delta: 'Hello', contentIndex: 0 });
        events.push({ type: 'text_delta', delta: ' world', contentIndex: 0 });
      }, 0);

      const stream = {
        [Symbol.asyncIterator]() {
          let index = 0;
          return {
            async next() {
              // Wait for events to be pushed
              await new Promise(r => setTimeout(r, 10));
              if (index < events.length) {
                return { value: events[index++], done: false };
              }
              return { value: undefined, done: true };
            }
          };
        },
        async result() {
          if (failure) {
            return {
              role: 'assistant' as const,
              content: [] as any[],
              usage: { input: 0, output: 0, reasoning: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0 },
              stopReason: 'error' as const,
              errorMessage: failure,
              timestamp: Date.now()
            };
          }
          return {
            role: 'assistant' as const,
            content: [{ type: 'text' as const, text: 'Hello world' }],
            api: 'ollama-native',
            provider: 'ollama',
            model: 'llama3',
            usage: {
              input: 10,
              output: 5,
              reasoning: 0,
              cacheRead: 0,
              cacheWrite: 0,
              totalTokens: 15,
              cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }
            },
            stopReason: 'stop' as const,
            timestamp: Date.now()
          };
        }
      };

      return stream;
    }
  }

  return {
    OllamaAdapter: MockOllamaAdapter,
    OllamaClient: MockOllamaAdapter,
    __esModule: true
  };
});

import { createAgenticRouter } from '../index';

jest.setTimeout(15000);

const USER_ID = '00000000-0000-4000-8000-000000000123';
const ENTITY_ID = '00000000-0000-4000-8000-000000000e01';

/** Two entity scopes, as a database with organizations and one agent-bearing entity type registers. */
const AGENT_CHAT = {
  scopes: [
    {
      scope: 'org',
      entityField: 'entity_id',
      schemaName: 'agent_public',
      threadTableName: 'org_agent_thread',
      messageTableName: 'org_agent_message',
      taskTableName: 'org_agent_task',
      membershipsSchemaName: 'memberships_public',
      membershipsTableName: 'org_memberships',
      membershipsEntityField: 'entity_id'
    },
    {
      scope: 'data_room',
      entityField: 'entity_id',
      schemaName: 'agent_public',
      threadTableName: 'data_room_agent_thread',
      messageTableName: 'data_room_agent_message',
      taskTableName: 'data_room_agent_task',
      membershipsSchemaName: 'memberships_public',
      membershipsTableName: 'data_room_memberships',
      membershipsEntityField: 'entity_id'
    }
  ]
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function createMockConstructiveContext(overrides: any = {}) {
  const queryResults: Record<string, any> = overrides.queryResults || {};
  const modules: Record<string, any> = overrides.modules || {};

  return {
    api: { schema: ['app_public'], ...overrides.api },
    token: overrides.token || { user_id: USER_ID },
    pgSettings: { role: 'authenticated', 'jwt.claims.user_id': USER_ID },
    databaseId: overrides.databaseId || 'db-uuid-123',
    userId: 'userId' in overrides ? overrides.userId : USER_ID,
    requestId: 'req-001',
    pool: {
      query: jest.fn(async () => ({ rows: [] as any[] }))
    },
    useModule: jest.fn(async (name: string) => {
      if (name === 'agentChat') {
        if (modules.agentChat === null) return undefined;
        return modules.agentChat ?? AGENT_CHAT;
      }
      if (name === 'billing') {
        return modules.billing ?? undefined;
      }
      if (name === 'inferenceLog') {
        return modules.inferenceLog ?? undefined;
      }
      return undefined;
    }),
    useBilling: jest.fn(async () => overrides.billingClient ?? null),
    useLlm: jest.fn(async () => overrides.llmConfig ?? null),
    withPgClient: jest.fn(async (fn: any) => {
      const mockClient = {
        query: jest.fn(async (sql: string, _params?: any[]) => {
          overrides.onQuery?.(sql);
          // Which scope's memberships table holds the entity
          if (sql.includes('AS idx')) {
            return queryResults.entityScope ?? { rows: [{ idx: 0 }] };
          }
          // Thread lookup
          if (sql.includes('SELECT id, mode, model')) {
            return queryResults.threadLookup ?? {
              rows: [{
                id: 'thread-001',
                mode: 'ask',
                model: null as string | null,
                system_prompt: null as string | null,
                status: 'active'
              }]
            };
          }
          // Message history
          if (sql.includes('ORDER BY created_at ASC')) {
            return queryResults.messageHistory ?? { rows: [] };
          }
          // INSERT (thread creation, message persistence)
          if (sql.includes('INSERT INTO')) {
            if (overrides.insertError) throw overrides.insertError;
            return queryResults.insert ?? {
              rows: [{
                id: 'thread-new-001',
                mode: 'ask',
                model: null as string | null,
                system_prompt: null as string | null,
                status: 'active',
                created_at: new Date().toISOString()
              }]
            };
          }
          return { rows: [] };
        })
      };
      return fn(mockClient);
    })
  };
}

function createTestApp(constructiveCtx: any) {
  const app = express();

  // Inject mock constructive context
  app.use((req: Request, _res: Response, next: NextFunction) => {
    (req as any).constructive = constructiveCtx;
    next();
  });

  app.use(createAgenticRouter());
  return app;
}

function makeRequest(app: any) {
  return supertest(app);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('agentic-server router', () => {

  describe('POST /v1/threads', () => {
    it('returns 401 when userId is null', async () => {
      const ctx = createMockConstructiveContext({ userId: null });
      const app = createTestApp(ctx);
      const request = makeRequest(app);

      const res = await request.post('/v1/threads').send({});
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Authentication required');
    });

    it('returns 404 when agent module not provisioned', async () => {
      const ctx = createMockConstructiveContext({
        modules: { agentChat: null }
      });
      const app = createTestApp(ctx);
      const request = makeRequest(app);

      const res = await request.post('/v1/threads').send({});
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not provisioned/);
    });

    it('creates a thread successfully', async () => {
      const ctx = createMockConstructiveContext();
      const app = createTestApp(ctx);
      const request = makeRequest(app);

      const res = await request
        .post('/v1/threads')
        .send({ mode: 'ask', title: 'Test Thread' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('status');
      expect(ctx.withPgClient).toHaveBeenCalled();
    });
  });

  describe('POST /v1/threads/:thread_id/messages', () => {
    it('returns 401 when userId is null', async () => {
      const ctx = createMockConstructiveContext({ userId: null });
      const app = createTestApp(ctx);
      const request = makeRequest(app);

      const res = await request
        .post('/v1/threads/thread-001/messages')
        .send({ messages: [{ role: 'user', content: 'Hello' }] });

      expect(res.status).toBe(401);
    });

    it('returns 400 when messages[] is empty', async () => {
      const ctx = createMockConstructiveContext();
      const app = createTestApp(ctx);
      const request = makeRequest(app);

      const res = await request
        .post('/v1/threads/thread-001/messages')
        .send({ messages: [] });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/messages/);
    });

    it('returns 404 when thread not found', async () => {
      const ctx = createMockConstructiveContext({
        queryResults: { threadLookup: { rows: [] } }
      });
      const app = createTestApp(ctx);
      const request = makeRequest(app);

      const res = await request
        .post('/v1/threads/nonexistent/messages')
        .send({ messages: [{ role: 'user', content: 'Hello' }] });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Thread not found');
    });

    it('returns batch response when stream=false', async () => {
      const ctx = createMockConstructiveContext();
      const app = createTestApp(ctx);
      const request = makeRequest(app);

      const res = await request
        .post('/v1/threads/thread-001/messages')
        .send({
          messages: [{ role: 'user', content: 'Hello' }],
          stream: false
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('choices');
      expect(res.body.choices[0].message.role).toBe('assistant');
      expect(res.body.choices[0].message.content).toBe('Hello world');
      expect(res.body).toHaveProperty('usage');
      expect(res.body.usage.prompt_tokens).toBe(10);
      expect(res.body.usage.completion_tokens).toBe(5);
    });

    it('streams SSE response when stream is not false', async () => {
      const ctx = createMockConstructiveContext();
      const app = createTestApp(ctx);

      // Use raw http server to test SSE
      const server = http.createServer(app);
      await new Promise<void>((resolve) => server.listen(0, resolve));
      const port = (server.address() as any).port;

      try {
        const response = await fetch(`http://localhost:${port}/v1/threads/thread-001/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: 'Hello' }]
          })
        });

        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toBe('text/event-stream');

        const text = await response.text();
        expect(text).toContain('data:');
        expect(text).toContain('[DONE]');
      } finally {
        server.close();
      }
    });

    it.each([
      ['batch', false],
      ['streaming', true]
    ])('hands the adapter an earlier assistant turn as content blocks (%s)', async (_name, stream) => {
      mockStreamContexts.length = 0;
      const ctx = createMockConstructiveContext({
        queryResults: {
          messageHistory: {
            rows: [
              { author_role: 'user', parts: [{ type: 'text', text: 'Hello' }] },
              { author_role: 'assistant', parts: [{ type: 'text', text: 'Hi there' }] },
              { author_role: 'user', parts: [{ type: 'text', text: 'Again' }] }
            ]
          }
        }
      });
      const request = makeRequest(createTestApp(ctx));

      const res = await request
        .post('/v1/threads/thread-001/messages')
        .send({ messages: [{ role: 'user', content: 'Again' }], stream });

      expect(res.status).toBe(200);
      expect(mockStreamContexts[0].messages.map((m: any) => [m.role, m.content])).toEqual([
        ['user', 'Hello'],
        ['assistant', [{ type: 'text', text: 'Hi there' }]],
        ['user', 'Again']
      ]);
    });

    it('writes each message under actor_id, the column the generated message table carries', async () => {
      const statements: string[] = [];
      const ctx = createMockConstructiveContext({ onQuery: (sql: string) => statements.push(sql) });
      const request = makeRequest(createTestApp(ctx));

      const res = await request
        .post('/v1/threads/thread-001/messages')
        .send({ messages: [{ role: 'user', content: 'Hello' }], stream: false });

      expect(res.status).toBe(200);
      const inserts = statements.filter((sql) => sql.includes('INSERT INTO'));
      expect(inserts).toHaveLength(2);
      for (const sql of inserts) {
        expect(sql).toMatch(/\(thread_id, actor_id, "entity_id", author_role, parts/);
        expect(sql).not.toMatch(/owner_id/);
      }
    });

    it('answers 403 when row-level security refuses the write', async () => {
      const ctx = createMockConstructiveContext({
        insertError: Object.assign(new Error('new row violates row-level security policy'), { code: '42501' })
      });
      const request = makeRequest(createTestApp(ctx));

      const res = await request
        .post(`/v1/orgs/${ENTITY_ID}/threads`)
        .send({ title: 'not my org' });

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: 'Forbidden' });
    });

    describe('when the model provider fails', () => {
      beforeEach(() => { mockStreamFailure.message = 'fetch failed'; });
      afterEach(() => { mockStreamFailure.message = null; });

      it('answers 502 and stores no assistant reply (batch)', async () => {
        const statements: string[] = [];
        const ctx = createMockConstructiveContext({ onQuery: (sql: string) => statements.push(sql) });
        const request = makeRequest(createTestApp(ctx));

        const res = await request
          .post('/v1/threads/thread-001/messages')
          .send({ messages: [{ role: 'user', content: 'Hello' }], stream: false });

        expect(res.status).toBe(502);
        expect(res.body).toEqual({ error: 'Model provider failed' });
        // Only the user's own message was written.
        expect(statements.filter((sql) => sql.includes('INSERT INTO'))).toHaveLength(1);
      });

      it('reports the failure as an event and stores no assistant reply (streaming)', async () => {
        const statements: string[] = [];
        const ctx = createMockConstructiveContext({ onQuery: (sql: string) => statements.push(sql) });
        const request = makeRequest(createTestApp(ctx));

        const res = await request
          .post('/v1/threads/thread-001/messages')
          .send({ messages: [{ role: 'user', content: 'Hello' }] });

        expect(res.text).toContain('"error":{"message":"Model provider failed"}');
        expect(res.text).toContain('[DONE]');
        expect(statements.filter((sql) => sql.includes('INSERT INTO'))).toHaveLength(1);
      });
    });

    it('returns 429 when billing quota exceeded', async () => {
      const mockBillingClient = {
        checkQuota: jest.fn(async () => false),
        recordUsage: jest.fn(async () => {}),
        logInference: jest.fn(async () => {})
      };

      const ctx = createMockConstructiveContext({
        billingClient: mockBillingClient
      });

      const app = createTestApp(ctx);
      const request = makeRequest(app);

      const res = await request
        .post('/v1/threads/thread-001/messages')
        .send({
          messages: [{ role: 'user', content: 'Hello' }],
          stream: false
        });

      expect(res.status).toBe(429);
      expect(res.body.error).toMatch(/quota/i);
    });
  });

  describe('POST /v1/embed', () => {
    it('returns 401 when userId is null', async () => {
      const ctx = createMockConstructiveContext({ userId: null });
      const app = createTestApp(ctx);
      const request = makeRequest(app);

      const res = await request.post('/v1/embed').send({ input: 'hello' });
      expect(res.status).toBe(401);
    });

    it('returns 400 when input is missing', async () => {
      const ctx = createMockConstructiveContext();
      const app = createTestApp(ctx);
      const request = makeRequest(app);

      const res = await request.post('/v1/embed').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/input/);
    });

    it('returns embeddings for a single string', async () => {
      const ctx = createMockConstructiveContext();
      const app = createTestApp(ctx);
      const request = makeRequest(app);

      const res = await request
        .post('/v1/embed')
        .send({ input: 'hello world' });

      expect(res.status).toBe(200);
      expect(res.body.object).toBe('list');
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].object).toBe('embedding');
      expect(res.body.data[0].embedding).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
      expect(res.body.usage.prompt_tokens).toBeGreaterThan(0);
    });

    it('returns embeddings for a batch of strings', async () => {
      const ctx = createMockConstructiveContext();
      const app = createTestApp(ctx);
      const request = makeRequest(app);

      const res = await request
        .post('/v1/embed')
        .send({ input: ['hello', 'world', 'test'] });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(3);
      expect(res.body.data[0].index).toBe(0);
      expect(res.body.data[1].index).toBe(1);
      expect(res.body.data[2].index).toBe(2);
    });
  });

  describe('Inference metering', () => {
    it('calls recordUsage and logInference after successful batch chat', async () => {
      const mockBillingClient = {
        checkQuota: jest.fn(async () => true),
        recordUsage: jest.fn(async () => {}),
        logInference: jest.fn(async () => {})
      };

      const ctx = createMockConstructiveContext({
        billingClient: mockBillingClient
      });
      const app = createTestApp(ctx);
      const request = makeRequest(app);

      const res = await request
        .post('/v1/threads/thread-001/messages')
        .send({
          messages: [{ role: 'user', content: 'Hello' }],
          stream: false
        });

      expect(res.status).toBe(200);

      // Wait for fire-and-forget billing calls
      await new Promise((r) => setTimeout(r, 50));

      expect(mockBillingClient.recordUsage).toHaveBeenCalledTimes(1);
      const [meterSlug, amount, metadata] = (mockBillingClient.recordUsage.mock.calls as any[][])[0];
      expect(typeof meterSlug).toBe('string');
      expect(amount).toBe(15); // 10 input + 5 output from mock
      expect(metadata).toMatchObject({
        input_tokens: 10,
        output_tokens: 5,
        model: expect.any(String),
        latency_ms: expect.any(Number),
        stream: false
      });

      expect(mockBillingClient.logInference).toHaveBeenCalledTimes(1);
      const inferenceEntry = (mockBillingClient.logInference.mock.calls as any[][])[0][0];
      expect(inferenceEntry).toMatchObject({
        service: 'llm',
        operation: 'chat',
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
        status: 'ok',
        provider: 'ollama',
        latencyMs: expect.any(Number)
      });
    });

    it('calls recordUsage and logInference after successful streaming chat', async () => {
      const mockBillingClient = {
        checkQuota: jest.fn(async () => true),
        recordUsage: jest.fn(async () => {}),
        logInference: jest.fn(async () => {})
      };

      const ctx = createMockConstructiveContext({
        billingClient: mockBillingClient
      });
      const app = createTestApp(ctx);

      const server = http.createServer(app);
      await new Promise<void>((resolve) => server.listen(0, resolve));
      const port = (server.address() as any).port;

      try {
        const response = await fetch(`http://localhost:${port}/v1/threads/thread-001/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: 'Hello' }],
            stream: true
          })
        });

        expect(response.status).toBe(200);
        await response.text(); // consume stream

        // Wait for fire-and-forget billing calls
        await new Promise((r) => setTimeout(r, 100));

        expect(mockBillingClient.recordUsage).toHaveBeenCalledTimes(1);
        const [, amount, metadata] = (mockBillingClient.recordUsage.mock.calls as any[][])[0];
        expect(amount).toBe(15);
        expect(metadata).toMatchObject({
          stream: true,
          input_tokens: 10,
          output_tokens: 5
        });

        expect(mockBillingClient.logInference).toHaveBeenCalledTimes(1);
        const entry = (mockBillingClient.logInference.mock.calls as any[][])[0][0];
        expect(entry.totalTokens).toBe(15);
        expect(entry.status).toBe('ok');
      } finally {
        server.close();
      }
    });

    it('calls recordUsage and logInference after successful embed', async () => {
      const mockBillingClient = {
        checkQuota: jest.fn(async () => true),
        recordUsage: jest.fn(async () => {}),
        logInference: jest.fn(async () => {})
      };

      const ctx = createMockConstructiveContext({
        billingClient: mockBillingClient
      });
      const app = createTestApp(ctx);
      const request = makeRequest(app);

      const res = await request
        .post('/v1/embed')
        .send({ input: 'hello world test' });

      expect(res.status).toBe(200);

      // Wait for fire-and-forget billing calls
      await new Promise((r) => setTimeout(r, 50));

      expect(mockBillingClient.recordUsage).toHaveBeenCalledTimes(1);
      const [, amount, metadata] = (mockBillingClient.recordUsage.mock.calls as any[][])[0];
      expect(amount).toBeGreaterThan(0);
      expect(metadata).toMatchObject({
        input_tokens: expect.any(Number),
        model: expect.any(String),
        latency_ms: expect.any(Number),
        batch_size: 1
      });

      expect(mockBillingClient.logInference).toHaveBeenCalledTimes(1);
      const entry = (mockBillingClient.logInference.mock.calls as any[][])[0][0];
      expect(entry).toMatchObject({
        service: 'embedding',
        operation: 'embed',
        outputTokens: 0,
        status: 'ok',
        provider: 'ollama'
      });
    });

    it('skips billing when billingClient is null', async () => {
      const ctx = createMockConstructiveContext({
        billingClient: null
      });
      const app = createTestApp(ctx);
      const request = makeRequest(app);

      const res = await request
        .post('/v1/threads/thread-001/messages')
        .send({
          messages: [{ role: 'user', content: 'Hello' }],
          stream: false
        });

      expect(res.status).toBe(200);
      // No billing calls — just verify no errors
    });

    it('does not crash when recordUsage or logInference rejects', async () => {
      const mockBillingClient = {
        checkQuota: jest.fn(async () => true),
        recordUsage: jest.fn(async () => { throw new Error('billing db down'); }),
        logInference: jest.fn(async () => { throw new Error('inference log db down'); })
      };

      const ctx = createMockConstructiveContext({
        billingClient: mockBillingClient
      });
      const app = createTestApp(ctx);
      const request = makeRequest(app);

      const res = await request
        .post('/v1/threads/thread-001/messages')
        .send({
          messages: [{ role: 'user', content: 'Hello' }],
          stream: false
        });

      // Response should still succeed despite billing failures
      expect(res.status).toBe(200);
      expect(res.body.choices[0].message.content).toBe('Hello world');

      await new Promise((r) => setTimeout(r, 50));
      expect(mockBillingClient.recordUsage).toHaveBeenCalled();
      expect(mockBillingClient.logInference).toHaveBeenCalled();
    });

    it('records latency_ms as positive number', async () => {
      const mockBillingClient = {
        checkQuota: jest.fn(async () => true),
        recordUsage: jest.fn(async () => {}),
        logInference: jest.fn(async () => {})
      };

      const ctx = createMockConstructiveContext({
        billingClient: mockBillingClient
      });
      const app = createTestApp(ctx);
      const request = makeRequest(app);

      await request
        .post('/v1/threads/thread-001/messages')
        .send({
          messages: [{ role: 'user', content: 'Hello' }],
          stream: false
        });

      await new Promise((r) => setTimeout(r, 50));

      const entry = (mockBillingClient.logInference.mock.calls as any[][])[0][0];
      expect(entry.latencyMs).toBeGreaterThanOrEqual(0);
      expect(typeof entry.latencyMs).toBe('number');
    });
  });

  describe('which agent module an entity resolves to', () => {
    const run = async (overrides: any, path = `/v1/orgs/${ENTITY_ID}/threads`, body: any = { title: 'x' }) => {
      const statements: string[] = [];
      const ctx = createMockConstructiveContext({ ...overrides, onQuery: (sql: string) => statements.push(sql) });
      const res = await makeRequest(createTestApp(ctx)).post(path).send(body);
      return { res, statements };
    };

    it('asks every scope\'s memberships table for the entity, as the request', async () => {
      const { statements } = await run({});
      const probe = statements.find((sql) => sql.includes('AS idx'));
      expect(probe).toContain('FROM "memberships_public"."org_memberships" WHERE "entity_id" = $1');
      expect(probe).toContain('FROM "memberships_public"."data_room_memberships" WHERE "entity_id" = $1');
      expect(probe).toContain(' UNION ALL ');
    });

    it('writes the thread to the tables of the scope that holds the entity', async () => {
      const org = await run({ queryResults: { entityScope: { rows: [{ idx: 0 }] } } });
      expect(org.res.status).toBe(201);
      expect(org.statements.find((sql) => sql.includes('INSERT INTO'))).toContain('"agent_public"."org_agent_thread"');

      const room = await run({ queryResults: { entityScope: { rows: [{ idx: 1 }] } } });
      expect(room.res.status).toBe(201);
      expect(room.statements.find((sql) => sql.includes('INSERT INTO'))).toContain('"agent_public"."data_room_agent_thread"');
    });

    it('answers 404 and writes nothing for an entity no scope holds', async () => {
      const { res, statements } = await run({ queryResults: { entityScope: { rows: [] } } });
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Entity not found' });
      expect(statements.some((sql) => sql.includes('INSERT INTO'))).toBe(false);
    });

    it('answers 404 without a query for an entity id that is not a uuid', async () => {
      const { res, statements } = await run({}, '/v1/orgs/not-a-uuid/threads');
      expect(res.status).toBe(404);
      expect(statements).toHaveLength(0);
    });

    it('refuses an entity two scopes both claim', async () => {
      const { res, statements } = await run({ queryResults: { entityScope: { rows: [{ idx: 0 }, { idx: 1 }] } } });
      expect(res.status).toBe(500);
      expect(statements.some((sql) => sql.includes('INSERT INTO'))).toBe(false);
    });

    it('looks a thread up under the entity the route names', async () => {
      const { statements } = await run(
        { queryResults: { entityScope: { rows: [{ idx: 1 }] } } },
        `/v1/orgs/${ENTITY_ID}/threads/thread-001/messages`,
        { messages: [{ role: 'user', content: 'Hello' }], stream: false }
      );
      const lookup = statements.find((sql) => sql.includes('SELECT id, mode, model'));
      expect(lookup).toContain('FROM "agent_public"."data_room_agent_thread"');
      expect(lookup).toContain('WHERE id = $1 AND "entity_id" = $2');
    });
  });

  describe('POST /v1/orgs/:entity_id/threads', () => {
    it('creates thread scoped to entity', async () => {
      const ctx = createMockConstructiveContext();
      const app = createTestApp(ctx);
      const request = makeRequest(app);

      const res = await request
        .post(`/v1/orgs/${ENTITY_ID}/threads`)
        .send({ mode: 'ask' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      // Verify entity_id was passed through (check withPgClient mock call)
      expect(ctx.withPgClient).toHaveBeenCalled();
    });
  });
});
