/**
 * Node-native fetch implementation.
 *
 * Drop-in shape-compatible with `globalThis.fetch` but uses `node:http` /
 * `node:https` under the hood. Addresses two limitations of Node's built-in
 * undici-backed fetch that matter when talking to a local Constructive /
 * PostGraphile server:
 *
 *   1. `*.localhost` subdomains (e.g. `api.localhost`) resolve via DNS and
 *      fail with `ENOTFOUND`. Here the connection target is rewritten to
 *      plain `localhost` (which resolves via both IPv4 and IPv6 loopback
 *      per RFC 6761) while the original `Host` header is preserved so
 *      server-side subdomain routing still works.
 *
 *   2. The Fetch spec classifies `Host` as a forbidden request header and
 *      silently drops it. `node:http` has no such restriction, so the
 *      rewritten Host survives to the server.
 *
 * Pass to any consumer that accepts `typeof globalThis.fetch`:
 *
 *   import { fetch } from '@constructive-io/node';
 *   const db = auth.createClient({
 *     endpoint: 'http://auth.localhost:3000/graphql',
 *     fetch,
 *   });
 */

import http from 'node:http';
import https from 'node:https';

export const fetch: typeof globalThis.fetch = async (input, init) => {
  const url = resolveUrl(input);
  const headers = normalizeHeaders(init?.headers);
  const method = init?.method ?? 'GET';
  const signal = init?.signal ?? undefined;
  const body = init?.body ?? undefined;

  let requestUrl = url;
  if (isLocalhostSubdomain(url.hostname)) {
    headers['host'] = url.host;
    requestUrl = new URL(url.href);
    requestUrl.hostname = 'localhost';
  }

  return new Promise<Response>((resolve, reject) => {
    if (signal?.aborted) {
      reject(toAbortError(signal));
      return;
    }

    const transport = requestUrl.protocol === 'https:' ? https : http;

    const req = transport.request(
      requestUrl,
      { method, headers },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          resolve(
            new Response(Buffer.concat(chunks), {
              status: res.statusCode ?? 0,
              statusText: res.statusMessage ?? '',
              headers: toHeadersInit(res.headers),
            }),
          );
        });
        res.on('error', reject);
      },
    );

    req.on('error', reject);

    if (signal) {
      const onAbort = () => req.destroy(toAbortError(signal));
      signal.addEventListener('abort', onAbort, { once: true });
      req.on('close', () => signal.removeEventListener('abort', onAbort));
    }

    if (body !== null && body !== undefined) {
      req.write(typeof body === 'string' || Buffer.isBuffer(body) ? body : String(body));
    }
    req.end();
  });
};

function resolveUrl(input: RequestInfo | URL): URL {
  if (input instanceof URL) return input;
  if (typeof input === 'string') return new URL(input);
  return new URL(input.url);
}

function normalizeHeaders(
  headers: HeadersInit | undefined,
): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) {
    const out: Record<string, string> = {};
    headers.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }
  if (Array.isArray(headers)) {
    const out: Record<string, string> = {};
    for (const [k, v] of headers) out[k] = v;
    return out;
  }
  return { ...(headers as Record<string, string>) };
}

function toHeadersInit(
  nodeHeaders: http.IncomingHttpHeaders,
): [string, string][] {
  const out: [string, string][] = [];
  for (const [k, v] of Object.entries(nodeHeaders)) {
    if (v === undefined) continue;
    out.push([k, Array.isArray(v) ? v.join(', ') : v]);
  }
  return out;
}

function isLocalhostSubdomain(hostname: string): boolean {
  return hostname.endsWith('.localhost') && hostname !== 'localhost';
}

function toAbortError(signal: AbortSignal): Error {
  const message =
    (signal.reason as Error | undefined)?.message ?? 'The operation was aborted';
  const err = new Error(message);
  err.name = 'AbortError';
  return err;
}
