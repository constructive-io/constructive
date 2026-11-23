/**
 * An image travels inside the JSON body as base64, so the gateway must accept
 * bodies far past express.json's 100kb default: a 300 KB photo was answered
 * `413 PayloadTooLargeError` before it reached the provider.
 */

import express from 'express';
import type { Server } from 'http';

import { createAgenticServer } from '../src';

const listen = (app: express.Express): Promise<{ server: Server; port: number }> =>
  new Promise((resolve) => {
    const server = app.listen(0, () => {
      const addr = server.address();
      resolve({ server, port: typeof addr === 'object' && addr ? addr.port : 0 });
    });
  });
const close = (server: Server) => new Promise<void>((r, e) => server.close((err) => (err ? e(err) : r())));

let llm: { server: Server; port: number };
let received: any[];
const servers: Server[] = [];

beforeAll(async () => {
  const llmApp = express();
  llmApp.use(express.json({ limit: '64mb' }));
  llmApp.post('/api/embed', (req: any, res: any) => {
    received.push(req.body);
    res.json({ embeddings: [[0.1, 0.2, 0.3]], prompt_eval_count: 7 });
  });
  llm = await listen(llmApp);
  servers.push(llm.server);
});

afterAll(async () => {
  await Promise.all(servers.map(close));
});

beforeEach(() => {
  received = [];
});

const gateway = async (bodyLimit?: number | string) => {
  const { server, port } = await listen(
    createAgenticServer({ providerType: 'ollama', providerBaseUrl: `http://localhost:${llm.port}`, defaultModel: 'embeddinggemma-2:440m', bodyLimit })
  );
  servers.push(server);
  return port;
};

const embedImage = (port: number, bytes: number) =>
  fetch(`http://localhost:${port}/v1/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Database-Id': '00000000-0000-0000-0000-000000000001' },
    body: JSON.stringify({ input: `data:image/png;base64,${Buffer.alloc(bytes, 7).toString('base64')}` })
  });

describe('request body limit', () => {
  it('embeds an image larger than 100kb', async () => {
    const res = await embedImage(await gateway(), 300 * 1024);
    expect(res.status).toBe(200);
    expect(received).toHaveLength(1);
    expect(received[0].input.image).toBe(Buffer.alloc(300 * 1024, 7).toString('base64'));
  });

  it('embeds a multi-megabyte image', async () => {
    const res = await embedImage(await gateway(), 8 * 1024 * 1024);
    expect(res.status).toBe(200);
    expect(received).toHaveLength(1);
  });

  it('still refuses a body past the configured limit, before the provider is called', async () => {
    const res = await embedImage(await gateway('100kb'), 300 * 1024);
    expect(res.status).toBe(413);
    expect(received).toHaveLength(0);
  });
});
