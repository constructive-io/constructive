/**
 * Integration tests for agentic-server (OpenAI-compatible gateway)
 *
 * Tests the full gateway pipeline against a mock LLM provider:
 *   - Multi-provider routing (Ollama) + request/response transforms
 *   - Identity header handling (X-Database-Id required; fail-loud when absent)
 *   - Header security (isPublic strips identity → request rejected)
 *   - Inference metering via an injected InferenceSink (fire-and-forget)
 *   - /v1/usage external reporting endpoint
 *   - Health check + provider listing
 *
 * The concrete compute_log/ModuleLoader sink lives in constructive-db; here we
 * inject a plain in-memory sink to assert the gateway's metering contract.
 */

import express from 'express';
import type { Server } from 'http';

import type { InferenceEntry } from '../src';
import { createAgenticServer } from '../src';

let mockLlmServer: Server;
let mockLlmPort: number;
let agenticServer: Server;
let agenticPort: number;

// Track requests the mock LLM receives
let llmRequests: Array<{ path: string; method: string; body: any }>;
// Track entries routed to the injected sink
let sinkEntries: InferenceEntry[];

beforeAll(async () => {
  // Start a mock LLM provider (simulates Ollama)
  const llmApp = express();
  llmApp.use(express.json());

  llmApp.post('/api/chat', (req: any, res: any) => {
    llmRequests.push({ path: req.path, method: req.method, body: req.body });
    res.json({
      message: { role: 'assistant', content: 'Mock Ollama response' },
      prompt_eval_count: 12,
      eval_count: 8
    });
  });

  llmApp.post('/api/embed', (req: any, res: any) => {
    llmRequests.push({ path: req.path, method: req.method, body: req.body });
    res.json({ embeddings: [[0.1, 0.2, 0.3, 0.4, 0.5]] });
  });

  await new Promise<void>((resolve) => {
    mockLlmServer = llmApp.listen(0, () => {
      const addr = mockLlmServer.address();
      mockLlmPort = typeof addr === 'object' && addr ? addr.port : 0;
      resolve();
    });
  });

  const app = createAgenticServer({
    providerType: 'ollama',
    providerBaseUrl: `http://localhost:${mockLlmPort}`,
    defaultModel: 'nomic-embed-text',
    inferenceSink: { logInference: (entry) => sinkEntries.push(entry) }
  });

  await new Promise<void>((resolve) => {
    agenticServer = app.listen(0, () => {
      const addr = agenticServer.address();
      agenticPort = typeof addr === 'object' && addr ? addr.port : 0;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((r, e) => agenticServer.close((err) => (err ? e(err) : r())));
  await new Promise<void>((r, e) => mockLlmServer.close((err) => (err ? e(err) : r())));
});

beforeEach(() => {
  llmRequests = [];
  sinkEntries = [];
});

// ─── Chat Completions ─────────────────────────────────────────────────────

describe('POST /v1/chat/completions', () => {
  it('proxies to Ollama and returns an OpenAI-compatible response', async () => {
    const res = await fetch(`http://localhost:${agenticPort}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Database-Id': 'db-test-1',
        'X-Entity-Id': 'entity-1',
        'X-Actor-Id': 'actor-1'
      },
      body: JSON.stringify({ model: 'llama3', messages: [{ role: 'user', content: 'Hello' }] })
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.choices).toHaveLength(1);
    expect(data.choices[0].message.content).toBe('Mock Ollama response');
    expect(data.usage.prompt_tokens).toBe(12);
    expect(data.usage.completion_tokens).toBe(8);

    expect(llmRequests).toHaveLength(1);
    expect(llmRequests[0].path).toBe('/api/chat');
    expect(llmRequests[0].body.model).toBe('llama3');
    expect(llmRequests[0].body.stream).toBe(false);
  });

  it('routes a successful chat completion to the injected sink', async () => {
    await fetch(`http://localhost:${agenticPort}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Database-Id': 'db-meter-1',
        'X-Entity-Id': 'entity-meter-1',
        'X-Actor-Id': 'actor-meter-1'
      },
      body: JSON.stringify({ model: 'llama3', messages: [{ role: 'user', content: 'Test metering' }] })
    });

    await new Promise((r) => setTimeout(r, 100));

    expect(sinkEntries).toHaveLength(1);
    expect(sinkEntries[0]).toMatchObject({
      databaseId: 'db-meter-1',
      entityId: 'entity-meter-1',
      actorId: 'actor-meter-1',
      service: 'chat',
      status: 'ok',
      inputTokens: 12,
      outputTokens: 8
    });
  });

  it('rejects the request (400) when no X-Database-Id header is present', async () => {
    const res = await fetch(`http://localhost:${agenticPort}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'llama3', messages: [{ role: 'user', content: 'no id' }] })
    });

    expect(res.status).toBe(400);
    await new Promise((r) => setTimeout(r, 50));
    expect(llmRequests).toHaveLength(0);
    expect(sinkEntries).toHaveLength(0);
  });
});

// ─── Embeddings ───────────────────────────────────────────────────────────

describe('POST /v1/embeddings', () => {
  it('proxies embedding to Ollama and returns an OpenAI-compatible response', async () => {
    const res = await fetch(`http://localhost:${agenticPort}/v1/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Database-Id': 'db-test-2',
        'X-Entity-Id': 'entity-2'
      },
      body: JSON.stringify({ model: 'nomic-embed-text', input: 'Hello world' })
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.object).toBe('list');
    expect(data.data).toHaveLength(1);
    expect(data.data[0].embedding).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);

    expect(llmRequests).toHaveLength(1);
    expect(llmRequests[0].path).toBe('/api/embed');
    expect(llmRequests[0].body.input).toBe('Hello world');

    await new Promise((r) => setTimeout(r, 100));
    expect(sinkEntries).toHaveLength(1);
    expect(sinkEntries[0]).toMatchObject({ databaseId: 'db-test-2', service: 'embed', status: 'ok' });
  });
});

// ─── Header Security (isPublic flag) ──────────────────────────────────────

describe('header security (isPublic)', () => {
  let publicServer: Server;
  let publicPort: number;
  let publicSinkEntries: InferenceEntry[];

  beforeAll(async () => {
    publicSinkEntries = [];
    const app = createAgenticServer({
      providerType: 'ollama',
      providerBaseUrl: `http://localhost:${mockLlmPort}`,
      defaultModel: 'nomic-embed-text',
      isPublic: true,
      inferenceSink: { logInference: (entry) => publicSinkEntries.push(entry) }
    });
    await new Promise<void>((resolve) => {
      publicServer = app.listen(0, () => {
        const addr = publicServer.address();
        publicPort = typeof addr === 'object' && addr ? addr.port : 0;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((r, e) => publicServer.close((err) => (err ? e(err) : r())));
  });

  it('rejects the request (400) when isPublic=true strips identity headers', async () => {
    publicSinkEntries.length = 0;
    const res = await fetch(`http://localhost:${publicPort}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Database-Id': 'SHOULD-BE-STRIPPED',
        'X-Entity-Id': 'SHOULD-BE-STRIPPED',
        'X-Actor-Id': 'SHOULD-BE-STRIPPED'
      },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'test' }] })
    });

    expect(res.status).toBe(400);
    expect(llmRequests).toHaveLength(0);
    await new Promise((r) => setTimeout(r, 50));
    expect(publicSinkEntries).toHaveLength(0);
  });
});

// ─── Usage Reporting ──────────────────────────────────────────────────────

describe('POST /v1/usage', () => {
  it('accepts external usage reports and routes them to the sink', async () => {
    const res = await fetch(`http://localhost:${agenticPort}/v1/usage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Database-Id': 'db-usage-1' },
      body: JSON.stringify({
        model: 'nomic-embed-text',
        provider: 'ollama',
        service: 'embed',
        operation: 'external',
        input_tokens: 100,
        output_tokens: 0,
        total_tokens: 100,
        latency_ms: 42,
        status: 'ok'
      })
    });

    expect(res.status).toBe(202);
    const data = (await res.json()) as any;
    expect(data.accepted).toBe(true);
    expect(sinkEntries).toHaveLength(1);
    expect(sinkEntries[0]).toMatchObject({ databaseId: 'db-usage-1', service: 'embed', inputTokens: 100 });
  });

  it('rejects usage reports without model', async () => {
    const res = await fetch(`http://localhost:${agenticPort}/v1/usage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Database-Id': 'db-usage-2' },
      body: JSON.stringify({})
    });
    expect(res.status).toBe(400);
  });

  it('rejects usage reports without X-Database-Id', async () => {
    const res = await fetch(`http://localhost:${agenticPort}/v1/usage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'nomic-embed-text' })
    });
    expect(res.status).toBe(400);
  });
});

// ─── Health & Providers ───────────────────────────────────────────────────

describe('GET /healthz', () => {
  it('returns provider status', async () => {
    const res = await fetch(`http://localhost:${agenticPort}/healthz`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.status).toBe('ok');
    expect(data.provider).toBe('ollama');
  });
});

describe('GET /v1/providers', () => {
  it('lists configured providers', async () => {
    const res = await fetch(`http://localhost:${agenticPort}/v1/providers`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.providers).toHaveLength(1);
    expect(data.providers[0].type).toBe('ollama');
  });
});
