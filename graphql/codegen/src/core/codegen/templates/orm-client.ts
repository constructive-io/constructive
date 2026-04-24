/**
 * ORM Client - Runtime GraphQL executor
 *
 * This is the RUNTIME code that gets copied to generated output.
 * Provides the core ORM client functionality for executing GraphQL operations.
 *
 * NOTE: This file is read at codegen time and written to output.
 * Any changes here will affect all generated ORM clients.
 */

import type {
  GraphQLAdapter,
  GraphQLError,
  QueryResult,
} from '@constructive-io/graphql-types';

export type {
  GraphQLAdapter,
  GraphQLError,
  QueryResult,
} from '@constructive-io/graphql-types';

// ============================================================================
// Isomorphic default fetch
// ============================================================================
//
// In browsers and non-Node runtimes (Deno, Bun, edge workers), the native
// `globalThis.fetch` is used directly. In Node, we wrap it with a
// `node:http`/`node:https` implementation to work around two limitations of
// Node's undici-backed fetch when talking to local PostGraphile servers:
//
//   1. `*.localhost` subdomains (e.g. `auth.localhost`) fail DNS resolution
//      with ENOTFOUND — the connection target is rewritten to plain
//      `localhost` (which resolves via both IPv4 and IPv6 loopback per
//      RFC 6761) while the original `Host` header is preserved so
//      server-side subdomain routing keeps working.
//   2. The Fetch spec classifies `Host` as a forbidden request header and
//      silently drops it. `node:http` has no such restriction.
//
// Callers can bypass this auto-detection by passing their own `fetch` to
// `OrmClientConfig` / `FetchAdapter`.

let _defaultFetchPromise: Promise<typeof globalThis.fetch> | undefined;

function resolveDefaultFetch(): Promise<typeof globalThis.fetch> {
  if (_defaultFetchPromise) return _defaultFetchPromise;
  return (_defaultFetchPromise = (async () => {
    const g = globalThis as {
      document?: unknown;
      process?: { versions?: { node?: string } };
    };
    // Browser or any runtime with a DOM: native fetch is fine.
    if (typeof g.document !== 'undefined') {
      return globalThis.fetch;
    }
    // Non-Node runtimes (Deno, Bun, edge workers): native fetch is fine.
    const isNode = !!g.process?.versions?.node;
    if (!isNode) return globalThis.fetch;
    try {
      // Bundler-opaque dynamic import — browser bundlers cannot statically
      // resolve `node:http` through `new Function`, so this branch is treated
      // as dead code in non-Node bundles.
      // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
      const dynImport = new Function('s', 'return import(s)') as (
        spec: string,
      ) => Promise<unknown>;
      const [http, https] = await Promise.all([
        dynImport('node:http'),
        dynImport('node:https'),
      ]);
      return buildNodeFetch(http, https);
    } catch {
      return globalThis.fetch;
    }
  })());
}

function buildNodeFetch(
  http: unknown,
  https: unknown,
): typeof globalThis.fetch {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const httpMod: any = (http as any).default ?? http;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const httpsMod: any = (https as any).default ?? https;

  return async (input, init) => {
    const url = toUrl(input);
    const headers = toHeaderRecord(init?.headers);
    const method = init?.method ?? 'GET';
    const body = init?.body ?? undefined;
    const signal = init?.signal ?? undefined;

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
      const transport = requestUrl.protocol === 'https:' ? httpsMod : httpMod;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const req: any = transport.request(
        requestUrl,
        { method, headers },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (res: any) => {
          const chunks: Uint8Array[] = [];
          res.on('data', (chunk: Uint8Array) => chunks.push(chunk));
          res.on('end', () => {
            let total = 0;
            for (const c of chunks) total += c.length;
            const buf = new Uint8Array(total);
            let offset = 0;
            for (const c of chunks) {
              buf.set(c, offset);
              offset += c.length;
            }
            const outHeaders: [string, string][] = [];
            for (const [k, v] of Object.entries(res.headers ?? {})) {
              if (v === undefined) continue;
              outHeaders.push([
                k,
                Array.isArray(v) ? v.join(', ') : String(v),
              ]);
            }
            resolve(
              new Response(buf, {
                status: res.statusCode ?? 0,
                statusText: res.statusMessage ?? '',
                headers: outHeaders,
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
        req.on('close', () =>
          signal.removeEventListener('abort', onAbort),
        );
      }
      if (body !== null && body !== undefined) {
        req.write(
          typeof body === 'string' || body instanceof Uint8Array
            ? body
            : String(body),
        );
      }
      req.end();
    });
  };
}

function toUrl(input: RequestInfo | URL): URL {
  if (input instanceof URL) return input;
  if (typeof input === 'string') return new URL(input);
  return new URL((input as { url: string }).url);
}

function toHeaderRecord(
  headers: HeadersInit | undefined,
): Record<string, string> {
  if (!headers) return {};
  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
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

function isLocalhostSubdomain(hostname: string): boolean {
  return hostname.endsWith('.localhost') && hostname !== 'localhost';
}

function toAbortError(signal: AbortSignal): Error {
  const message =
    (signal.reason as Error | undefined)?.message ??
    'The operation was aborted';
  const err = new Error(message);
  err.name = 'AbortError';
  return err;
}

/**
 * Default adapter that uses fetch for HTTP requests.
 *
 * When no `fetchFn` is provided, defaults to an isomorphic fetch that uses
 * `globalThis.fetch` in browsers/Deno/Bun and falls back to a Node-native
 * wrapper in Node to handle `*.localhost` subdomain DNS and `Host` header
 * preservation. Pass an explicit `fetchFn` to bypass this behavior.
 */
export class FetchAdapter implements GraphQLAdapter {
  private headers: Record<string, string>;
  private fetchFn: typeof globalThis.fetch | undefined;

  constructor(
    private endpoint: string,
    headers?: Record<string, string>,
    fetchFn?: typeof globalThis.fetch,
  ) {
    this.headers = headers ?? {};
    this.fetchFn = fetchFn;
  }

  async execute<T>(
    document: string,
    variables?: Record<string, unknown>,
  ): Promise<QueryResult<T>> {
    const fetchImpl = this.fetchFn ?? (await resolveDefaultFetch());
    const response = await fetchImpl(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...this.headers,
      },
      body: JSON.stringify({
        query: document,
        variables: variables ?? {},
      }),
    });

    if (!response.ok) {
      return {
        ok: false,
        data: null,
        errors: [
          { message: `HTTP ${response.status}: ${response.statusText}` },
        ],
      };
    }

    const json = (await response.json()) as {
      data?: T;
      errors?: GraphQLError[];
    };

    if (json.errors && json.errors.length > 0) {
      return {
        ok: false,
        data: null,
        errors: json.errors,
      };
    }

    return {
      ok: true,
      data: json.data as T,
      errors: undefined,
    };
  }

  setHeaders(headers: Record<string, string>): void {
    this.headers = { ...this.headers, ...headers };
  }

  getEndpoint(): string {
    return this.endpoint;
  }
}

/**
 * Configuration for creating an ORM client.
 * Either provide endpoint (and optional headers/fetch) for HTTP requests,
 * or provide a custom adapter for alternative execution strategies.
 */
export interface OrmClientConfig {
  /** GraphQL endpoint URL (required if adapter not provided) */
  endpoint?: string;
  /** Default headers for HTTP requests (only used with endpoint) */
  headers?: Record<string, string>;
  /**
   * Custom fetch implementation. If omitted, an isomorphic default is
   * used that auto-handles Node's `*.localhost` / Host-header quirks.
   * Pass your own fetch to override that behavior (e.g. a mock in tests,
   * or a fetch with preconfigured credentials/proxy).
   */
  fetch?: typeof globalThis.fetch;
  /** Custom adapter for GraphQL execution (overrides endpoint/headers/fetch) */
  adapter?: GraphQLAdapter;
}

/**
 * Error thrown when GraphQL request fails
 */
export class GraphQLRequestError extends Error {
  constructor(
    public readonly errors: GraphQLError[],
    public readonly data: unknown = null,
  ) {
    const messages = errors.map((e) => e.message).join('; ');
    super(`GraphQL Error: ${messages}`);
    this.name = 'GraphQLRequestError';
  }
}

export class OrmClient {
  private adapter: GraphQLAdapter;

  constructor(config: OrmClientConfig) {
    if (config.adapter) {
      this.adapter = config.adapter;
    } else if (config.endpoint) {
      this.adapter = new FetchAdapter(
        config.endpoint,
        config.headers,
        config.fetch,
      );
    } else {
      throw new Error(
        'OrmClientConfig requires either an endpoint or a custom adapter',
      );
    }
  }

  async execute<T>(
    document: string,
    variables?: Record<string, unknown>,
  ): Promise<QueryResult<T>> {
    return this.adapter.execute<T>(document, variables);
  }

  /**
   * Set headers for requests.
   * Only works if the adapter supports headers.
   */
  setHeaders(headers: Record<string, string>): void {
    if (this.adapter.setHeaders) {
      this.adapter.setHeaders(headers);
    }
  }

  /**
   * Get the endpoint URL.
   * Returns empty string if the adapter doesn't have an endpoint.
   */
  getEndpoint(): string {
    return this.adapter.getEndpoint?.() ?? '';
  }
}
