import http from 'node:http';
import https from 'node:https';
import type { JsonHttpResult } from '../types';

export async function getJson(url: string, timeoutMs = 10_000): Promise<JsonHttpResult> {
  const startedAt = Date.now();
  return await new Promise((resolve) => {
    const target = new URL(url);
    const client = target.protocol === 'https:' ? https : http;
    const req = client.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port || (target.protocol === 'https:' ? 443 : 80),
        path: `${target.pathname}${target.search}`,
        method: 'GET',
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let json: unknown;
          try {
            json = JSON.parse(text);
          } catch {
            json = undefined;
          }
          const status = Number(res.statusCode ?? 0);
          resolve({
            ok: status >= 200 && status < 300,
            status,
            elapsedMs: Date.now() - startedAt,
            json,
            text,
          });
        });
      },
    );

    req.on('error', (error) => {
      resolve({
        ok: false,
        status: 0,
        elapsedMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
      });
    });
    req.setTimeout(timeoutMs, () => req.destroy(new Error(`Request timeout after ${timeoutMs}ms`)));
    req.end();
  });
}

export async function waitForJsonOk(url: string, timeoutMs: number, intervalMs = 1000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let last: JsonHttpResult | undefined;
  while (Date.now() < deadline) {
    last = await getJson(url, Math.min(intervalMs, 5000));
    if (last.ok) return;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Timed out waiting for ${url}; last=${JSON.stringify(last)}`);
}
