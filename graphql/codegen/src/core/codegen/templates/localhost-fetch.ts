/**
 * Localhost fetch adapter for CLI
 *
 * Node.js cannot resolve *.localhost subdomains (ENOTFOUND) — only browsers do.
 * The Constructive GraphQL server uses Host-header-based subdomain routing
 * (enableServicesApi), so requests must carry the correct Host header.
 *
 * The Fetch API treats "Host" as a **forbidden request header** and silently
 * drops it. This module patches globalThis.fetch to use node:http.request for
 * *.localhost URLs, giving full control over the Host header.
 *
 * This patch is automatically applied when the CLI is generated with localhost
 * adapter support, enabling seamless local development with subdomain routing.
 *
 * NOTE: This file is read at codegen time and written to output.
 * Any changes here will affect all generated CLI localhost adapters.
 */

import http from 'node:http';

const _origFetch = globalThis.fetch;

/**
 * Convert a Headers/object/array to a plain object for http.request.
 */
function headersToObject(
  headers: HeadersInit | undefined,
): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) {
    const obj: Record<string, string> = {};
    headers.forEach((v, k) => {
      obj[k] = v;
    });
    return obj;
  }
  if (Array.isArray(headers)) {
    const obj: Record<string, string> = {};
    for (const entry of headers) {
      if (Array.isArray(entry)) {
        obj[entry[0]] = entry[1];
      }
    }
    return obj;
  }
  if (typeof headers === 'object') return { ...headers };
  return {};
}

/**
 * Perform the request using http.request so we can set the Host header freely.
 * Returns a spec-compliant Response object.
 */
function httpFetch(url: URL, init: RequestInit | undefined): Promise<Response> {
  return new Promise((resolve, reject) => {
    const method = init?.method || 'GET';
    const hdrs = headersToObject(init?.headers);

    const opts = {
      hostname: url.hostname, // already rewritten to "localhost"
      port: url.port || 80,
      path: url.pathname + url.search,
      method,
      headers: hdrs,
    };

    const req = http.request(opts, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks);
        const respHeaders = new Headers();
        for (const [k, v] of Object.entries(res.headers)) {
          if (v != null) {
            if (Array.isArray(v)) {
              v.forEach((val) => respHeaders.append(k, val));
            } else {
              respHeaders.set(k, String(v));
            }
          }
        }
        resolve(
          new Response(body, {
            status: res.statusCode,
            statusText: res.statusMessage,
            headers: respHeaders,
          }),
        );
      });
    });

    req.on('error', reject);

    if (init?.body != null) {
      if (typeof init.body === 'string' || Buffer.isBuffer(init.body)) {
        req.write(init.body);
      } else if (init.body instanceof Uint8Array) {
        req.write(Buffer.from(init.body));
      }
    }

    req.end();
  });
}

globalThis.fetch = function patchedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  let urlStr: string;
  if (typeof input === 'string') {
    urlStr = input;
  } else if (input instanceof URL) {
    urlStr = input.href;
  } else if (input instanceof Request) {
    urlStr = input.url;
    if (!init) init = {};
    if (!init.method && input.method) init.method = input.method;
    if (!init.headers && input.headers) init.headers = input.headers;
  } else {
    return _origFetch(input, init);
  }

  let url: URL;
  try {
    url = new URL(urlStr);
  } catch {
    return _origFetch(input, init);
  }

  // Only patch *.localhost subdomains (not bare "localhost")
  if (url.hostname.endsWith('.localhost') && url.hostname !== 'localhost') {
    const hostValue = url.host; // e.g. "auth.localhost:3000"
    url.hostname = 'localhost'; // rewrite so Node.js can connect

    // Inject Host header for server-side subdomain routing
    init = init ? { ...init } : {};
    const hdrs = headersToObject(init.headers);
    hdrs['host'] = hostValue;
    init.headers = hdrs;

    // Use http.request which allows the Host header (fetch API forbids it)
    return httpFetch(url, init);
  }

  return _origFetch(input, init);
};
