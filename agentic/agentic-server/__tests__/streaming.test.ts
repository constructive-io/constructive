/**
 * Streaming tests for agentic-server.
 *
 * A harness that asks for `stream: true` needs its tokens as the provider emits
 * them, so the gateway relays an OpenAI-compatible event stream verbatim rather
 * than parsing the body as JSON. These tests assert the relayed frames, the
 * usage the stream carries reaching the injected sink, the frame-splitting the
 * scanner does across arbitrary chunk boundaries, and the loud rejection of a
 * provider type whose stream the gateway cannot translate.
 */

import express from 'express';
import type { Server } from 'http';

import type { InferenceEntry } from '../src';
import { createAgenticServer } from '../src';
import { UsageScanner, withUsageStreamOptions } from '../src/streaming';

const CHUNKS = [
  'data: {"id":"c1","choices":[{"delta":{"content":"Hel"}}]}\n\n',
  'data: {"id":"c1","choices":[{"delta":{"content":"lo"}}]}\n\n',
  'data: {"id":"c1","choices":[{"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":11,"completion_tokens":5,"total_tokens":16}}\n\n',
  'data: [DONE]\n\n'
];

let mockLlmServer: Server;
let mockLlmPort: number;
let agenticServer: Server;
let agenticPort: number;
let ollamaServer: Server;
let ollamaPort: number;

let llmRequests: Array<{ body: any }>;
let sinkEntries: InferenceEntry[];

beforeAll(async () => {
  const llmApp = express();
  llmApp.use(express.json());

  llmApp.post('/v1/chat/completions', (req: any, res: any) => {
    llmRequests.push({ body: req.body });
    res.setHeader('Content-Type', 'text/event-stream');
    for (const chunk of CHUNKS) res.write(chunk);
    res.end();
  });

  await new Promise<void>((resolve) => {
    mockLlmServer = llmApp.listen(0, () => {
      const addr = mockLlmServer.address();
      mockLlmPort = typeof addr === 'object' && addr ? addr.port : 0;
      resolve();
    });
  });

  const app = createAgenticServer({
    providerType: 'openai',
    providerBaseUrl: `http://localhost:${mockLlmPort}`,
    providerApiKey: 'test-key',
    defaultModel: 'gpt-4o-mini',
    inferenceSink: { logInference: (entry) => sinkEntries.push(entry) }
  });

  await new Promise<void>((resolve) => {
    agenticServer = app.listen(0, () => {
      const addr = agenticServer.address();
      agenticPort = typeof addr === 'object' && addr ? addr.port : 0;
      resolve();
    });
  });

  const ollamaApp = createAgenticServer({
    providerType: 'ollama',
    providerBaseUrl: `http://localhost:${mockLlmPort}`,
    defaultModel: 'llama3'
  });

  await new Promise<void>((resolve) => {
    ollamaServer = ollamaApp.listen(0, () => {
      const addr = ollamaServer.address();
      ollamaPort = typeof addr === 'object' && addr ? addr.port : 0;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((r, e) => agenticServer.close((err) => (err ? e(err) : r())));
  await new Promise<void>((r, e) => ollamaServer.close((err) => (err ? e(err) : r())));
  await new Promise<void>((r, e) => mockLlmServer.close((err) => (err ? e(err) : r())));
});

beforeEach(() => {
  llmRequests = [];
  sinkEntries = [];
});

// ─── SSE relay ────────────────────────────────────────────────────────────

describe('POST /v1/chat/completions with stream: true', () => {
  it('relays the provider event stream and meters the usage it carried', async () => {
    const res = await fetch(`http://localhost:${agenticPort}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Database-Id': 'db-stream-1',
        'X-Entity-Id': 'entity-stream-1'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        stream: true,
        messages: [{ role: 'user', content: 'Hello' }]
      })
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    expect(await res.text()).toBe(CHUNKS.join(''));

    expect(llmRequests).toHaveLength(1);
    expect(llmRequests[0].body.stream).toBe(true);
    expect(llmRequests[0].body.stream_options).toEqual({ include_usage: true });

    await new Promise((r) => setTimeout(r, 100));
    expect(sinkEntries).toHaveLength(1);
    expect(sinkEntries[0]).toMatchObject({
      databaseId: 'db-stream-1',
      entityId: 'entity-stream-1',
      service: 'chat',
      status: 'ok',
      inputTokens: 11,
      outputTokens: 5,
      totalTokens: 16
    });
  });

  it('rejects (501) a provider type whose stream the gateway cannot translate', async () => {
    const res = await fetch(`http://localhost:${ollamaPort}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Database-Id': 'db-stream-2' },
      body: JSON.stringify({ model: 'llama3', stream: true, messages: [] })
    });

    expect(res.status).toBe(501);
    expect(llmRequests).toHaveLength(0);
  });
});

// ─── Usage scanning ───────────────────────────────────────────────────────

describe('UsageScanner', () => {
  it('finds usage split across arbitrary chunk boundaries', () => {
    const scanner = new UsageScanner();
    const stream = CHUNKS.join('');
    for (let i = 0; i < stream.length; i += 7) scanner.push(stream.slice(i, i + 7));

    expect(scanner.result()).toEqual({ prompt_tokens: 11, completion_tokens: 5, total_tokens: 16 });
  });

  it('reports no usage for a stream that carried none', () => {
    const scanner = new UsageScanner();
    scanner.push('data: {"choices":[{"delta":{"content":"hi"}}]}\n\ndata: [DONE]\n\n');

    expect(scanner.result()).toBeUndefined();
  });

  it('ignores a frame it cannot parse and keeps scanning', () => {
    const scanner = new UsageScanner();
    scanner.push(': keep-alive\n\ndata: not-json\n\n');
    scanner.push('data: {"usage":{"prompt_tokens":3,"completion_tokens":4}}\n\n');

    expect(scanner.result()).toEqual({ prompt_tokens: 3, completion_tokens: 4, total_tokens: 7 });
  });
});

describe('withUsageStreamOptions', () => {
  it('asks the provider for usage when the caller expressed no preference', () => {
    expect(withUsageStreamOptions({ model: 'gpt-4o-mini' })).toEqual({
      model: 'gpt-4o-mini',
      stream_options: { include_usage: true }
    });
  });

  it('keeps the stream options the caller chose', () => {
    const body = { model: 'gpt-4o-mini', stream_options: { include_usage: false } };
    expect(withUsageStreamOptions(body)).toBe(body);
  });
});
