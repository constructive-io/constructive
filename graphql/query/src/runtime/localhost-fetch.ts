/**
 * Isomorphic fetch that resolves *.localhost subdomains and preserves
 * Host headers across Node.js and browsers.
 *
 * Node.js has two issues with *.localhost subdomains:
 * 1. DNS — fetch('http://auth.localhost:3000/') throws ENOTFOUND
 *    because undici doesn't resolve *.localhost to loopback.
 * 2. Host header — Node's fetch treats Host as forbidden and silently
 *    drops it, breaking server-side subdomain routing.
 *
 * In browsers *.localhost resolves natively, so createFetch() returns
 * globalThis.fetch as-is.
 */

export type FetchFunction = typeof globalThis.fetch;

export function isLocalhostSubdomain(hostname: string): boolean {
  return hostname.endsWith('.localhost') && hostname !== 'localhost';
}

function buildNodeFetch(
  http: typeof import('node:http'),
  https: typeof import('node:https'),
): FetchFunction {
  return (input, init) => {
    const url = new URL(
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
    );

    if (!isLocalhostSubdomain(url.hostname)) {
      return globalThis.fetch(input, init);
    }

    const originalHost = url.host;
    url.hostname = 'localhost';

    return new Promise((resolve, reject) => {
      const headers: Record<string, string> = {
        Host: originalHost,
      };

      if (init?.headers) {
        const entries =
          init.headers instanceof Headers
            ? Array.from(init.headers.entries())
            : Array.isArray(init.headers)
              ? init.headers
              : Object.entries(init.headers);
        for (const [key, value] of entries) {
          headers[key] = value;
        }
      }

      const protocol = url.protocol === 'https:' ? https : http;

      const req = protocol.request(
        url,
        {
          method: init?.method ?? 'GET',
          headers,
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => {
            const body = Buffer.concat(chunks);
            resolve(
              new Response(body, {
                status: res.statusCode ?? 0,
                statusText: res.statusMessage ?? '',
                headers: res.headers as Record<string, string>,
              }),
            );
          });
        },
      );

      req.on('error', reject);

      if (init?.signal) {
        const onAbort = () => {
          req.destroy(new Error('The operation was aborted'));
        };
        init.signal.addEventListener('abort', onAbort, { once: true });
        req.on('close', () => {
          init.signal!.removeEventListener('abort', onAbort);
        });
      }

      if (init?.body != null) {
        req.write(
          typeof init.body === 'string' || init.body instanceof Uint8Array
            ? init.body
            : String(init.body),
        );
      }

      req.end();
    });
  };
}

let _fetch: FetchFunction | undefined;

/**
 * Create an isomorphic fetch function.
 *
 * - In browsers (and Deno/Bun/edge): returns globalThis.fetch as-is.
 * - In Node.js: returns a wrapper that uses node:http/node:https for
 *   *.localhost URLs (fixing DNS + Host header) and delegates everything
 *   else to globalThis.fetch.
 *
 * The result is cached — calling createFetch() multiple times returns
 * the same function instance.
 */
export function createFetch(): FetchFunction {
  if (_fetch) return _fetch;

  if (typeof process !== 'undefined' && process.versions?.node) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const http = require('node:http');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const https = require('node:https');
      _fetch = buildNodeFetch(http, https);
      return _fetch;
    } catch {
      // node:http unavailable — fall through
    }
  }

  _fetch = globalThis.fetch;
  return _fetch;
}
