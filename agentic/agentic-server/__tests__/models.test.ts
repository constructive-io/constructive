/**
 * GET /v1/models — the models a caller can run, and nothing about who serves
 * them — plus what the gateway tells a caller that named a model nobody serves.
 */

import express from 'express';
import type { Server } from 'http';
import type { AddressInfo } from 'net';

import { createAgenticServer } from '../src';

const listen = (app: express.Express): Promise<Server> =>
  new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
const port = (server: Server): number => (server.address() as AddressInfo).port;
const close = (server: Server): Promise<void> =>
  new Promise((resolve) => server.close(() => resolve()));

let ollama: Server;
let openai: Server;
let anthropic: Server;
let down: Server;
let gateway: Server;
let base: string;
let upstreamHeaders: Record<string, string | string[] | undefined>[];

beforeAll(async () => {
  const ollamaApp = express();
  ollamaApp.use(express.json());
  ollamaApp.get('/api/tags', (_req, res) => {
    res.json({ models: [{ name: 'llama3.2:latest', model: 'llama3.2:latest', size: 2019393189 }] });
  });
  ollamaApp.post('/api/chat', (req, res) => {
    res.status(404).json({ error: `model '${req.body.model}' not found` });
  });
  ollama = await listen(ollamaApp);

  const openaiApp = express();
  openaiApp.get('/v1/models', (req, res) => {
    upstreamHeaders.push(req.headers);
    res.json({
      object: 'list',
      data: [
        { id: 'gpt-4o', object: 'model', owned_by: 'openai' },
        // A family the router would otherwise send to the Ollama entry.
        { id: 'llama-hosted', object: 'model', owned_by: 'someone' },
        // An upstream id whose own first segment is the dialect the router strips.
        { id: 'openai/gpt-oss-120b', object: 'model', owned_by: 'someone' }
      ]
    });
  });
  openai = await listen(openaiApp);

  const anthropicApp = express();
  anthropicApp.get('/v1/models', (req, res) => {
    if (req.query.after_id === 'claude-sonnet-4-5') {
      res.json({
        data: [{ id: 'claude-haiku-4-5', display_name: 'Claude Haiku 4.5', type: 'model' }],
        has_more: false,
        last_id: 'claude-haiku-4-5'
      });
      return;
    }
    res.json({
      data: [{ id: 'claude-sonnet-4-5', display_name: 'Claude Sonnet 4.5', type: 'model' }],
      has_more: true,
      last_id: 'claude-sonnet-4-5'
    });
  });
  anthropic = await listen(anthropicApp);

  const downApp = express();
  downApp.get('/v1/models', (_req, res) => {
    res.status(500).json({ error: 'secret-internal-detail' });
  });
  down = await listen(downApp);

  gateway = await listen(createAgenticServer({
    providers: [
      { type: 'ollama', baseUrl: `http://localhost:${port(ollama)}` },
      { name: 'hosted', type: 'openai', baseUrl: `http://localhost:${port(openai)}`, apiKey: 'sk-upstream' },
      { type: 'anthropic', baseUrl: `http://localhost:${port(anthropic)}`, apiKey: 'sk-ant' }
    ]
  }));
  base = `http://localhost:${port(gateway)}`;
});

afterAll(async () => {
  await Promise.all([ollama, openai, anthropic, down, gateway].map(close));
});

beforeEach(() => {
  upstreamHeaders = [];
});

describe('GET /v1/models', () => {
  it('is refused without the identity a run carries', async () => {
    const res = await fetch(`${base}/v1/models`);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: { message: 'X-Database-Id is required' } });
  });

  it('lists each served model by the id a request addresses it with, and a display name', async () => {
    const res = await fetch(`${base}/v1/models`, { headers: { 'X-Database-Id': 'db-1' } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      object: 'list',
      data: [
        { id: 'llama3.2:latest', name: 'llama3.2:latest' },
        { id: 'gpt-4o', name: 'gpt-4o' },
        // Bare, this id would route to another entry; the prefix is what reaches it.
        { id: 'hosted/llama-hosted', name: 'llama-hosted' },
        // Bare, the gateway would strip `openai/` before the upstream saw it.
        { id: 'hosted/openai/gpt-oss-120b', name: 'openai/gpt-oss-120b' },
        // Both pages of a paged listing.
        { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5' },
        { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5' }
      ]
    });
  });

  it('says nothing about the provider setup', async () => {
    const res = await fetch(`${base}/v1/models`, { headers: { 'X-Database-Id': 'db-1' } });
    const text = await res.text();
    for (const internal of ['localhost', 'sk-upstream', 'sk-ant', 'owned_by', 'baseUrl', 'apiKey', 'size', '"type"', '"provider"']) {
      expect(text).not.toContain(internal);
    }
    // The upstream is asked with the gateway's key, never the caller's headers.
    expect(upstreamHeaders[0].authorization).toBe('Bearer sk-upstream');
    expect(upstreamHeaders[0]['x-database-id']).toBeUndefined();
  });

  it('answers 502 without the upstream reason when a provider cannot be listed', async () => {
    const broken = await listen(createAgenticServer({
      providers: [{ type: 'openai', baseUrl: `http://localhost:${port(down)}`, apiKey: 'sk-upstream' }]
    }));
    const res = await fetch(`http://localhost:${port(broken)}/v1/models`, { headers: { 'X-Database-Id': 'db-1' } });
    await close(broken);
    expect(res.status).toBe(502);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ error: { message: 'the model list is unavailable' } });
    expect(text).not.toContain('secret-internal-detail');
  });
});

describe('a model nobody serves', () => {
  it('is told how to list the ones that are', async () => {
    const res = await fetch(`${base}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Database-Id': 'db-1' },
      body: JSON.stringify({ model: 'llama-typo', messages: [{ role: 'user', content: 'hi' }] })
    });
    expect(res.status).toBe(404);
    const { error } = await res.json() as { error: { message: string } };
    expect(error.message).toContain("model 'llama-typo' not found");
    expect(error.message).toContain('GET /v1/models lists the models this gateway serves');
  });
});

describe('GET /healthz', () => {
  it('reports liveness and nothing about the providers', async () => {
    const res = await fetch(`${base}/healthz`);
    expect(await res.json()).toEqual({ status: 'ok' });
  });
});
