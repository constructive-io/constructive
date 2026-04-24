/**
 * Tests for the Node-native `fetch` export.
 *
 * Covers the two Node-specific quirks that motivated this helper:
 *   - `*.localhost` subdomains are rewritten to a loopback target that
 *     resolves (Node's undici-backed fetch fails with ENOTFOUND otherwise).
 *   - The original hostname is preserved in the `Host` header so server-side
 *     subdomain routing (e.g. PostGraphile's enableServicesApi) still works.
 */
import http from 'node:http';
import type { AddressInfo } from 'node:net';

import { fetch } from '../fetch';

type Captured = {
  host?: string;
  method?: string;
  body: string;
};

function startEchoServer(): Promise<{
  port: number;
  captured: Captured;
  close: () => Promise<void>;
}> {
  const captured: Captured = { body: '' };
  const server = http.createServer((req, res) => {
    captured.host = req.headers.host;
    captured.method = req.method;
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      captured.body = Buffer.concat(chunks).toString('utf8');
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, echoed: captured.body }));
    });
  });

  return new Promise((resolve) => {
    server.listen(0, 'localhost', () => {
      const { port } = server.address() as AddressInfo;
      resolve({
        port,
        captured,
        close: () =>
          new Promise<void>((r, rj) =>
            server.close((err) => (err ? rj(err) : r())),
          ),
      });
    });
  });
}

describe('fetch (node)', () => {
  it('routes *.localhost requests to loopback and preserves the original Host header', async () => {
    const { port, captured, close } = await startEchoServer();
    try {
      const url = `http://auth.localhost:${port}/graphql`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: '{ __typename }' }),
      });

      expect(response.ok).toBe(true);
      expect(captured.method).toBe('POST');
      expect(captured.host).toBe(`auth.localhost:${port}`);
      expect(captured.body).toBe('{"query":"{ __typename }"}');

      const json = (await response.json()) as { ok: boolean };
      expect(json.ok).toBe(true);
    } finally {
      await close();
    }
  });

  it('leaves non-subdomain hostnames alone', async () => {
    const { port, captured, close } = await startEchoServer();
    try {
      const response = await fetch(`http://localhost:${port}/`, {
        method: 'GET',
      });
      expect(response.ok).toBe(true);
      expect(captured.host).toBe(`localhost:${port}`);
    } finally {
      await close();
    }
  });
});
