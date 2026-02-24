/**
 * Node HTTP Adapter for Node.js applications
 *
 * Implements the GraphQLAdapter interface using node:http / node:https
 * instead of the Fetch API. This solves two Node.js limitations:
 *
 * 1. DNS: Node.js cannot resolve *.localhost subdomains (ENOTFOUND).
 *    Browsers handle this automatically, but Node requires manual resolution.
 *
 * 2. Host header: The Fetch API treats "Host" as a forbidden request header
 *    and silently drops it. The Constructive GraphQL server uses Host-header
 *    subdomain routing (enableServicesApi), so this header must be preserved.
 *
 * By using node:http.request directly, both issues are bypassed cleanly
 * without any global patching.
 *
 * NOTE: This file is read at codegen time and written to output.
 * Any changes here will affect all generated CLI node adapters.
 */

import http from 'node:http';
import https from 'node:https';

import type {
  GraphQLAdapter,
  GraphQLError,
  QueryResult,
} from '@constructive-io/graphql-types';

interface HttpResponse {
  statusCode: number;
  statusMessage: string;
  data: string;
}

/**
 * Check if a hostname is a localhost subdomain that needs special handling.
 * Returns true for *.localhost (e.g. auth.localhost) but not bare "localhost".
 */
function isLocalhostSubdomain(hostname: string): boolean {
  return hostname.endsWith('.localhost') && hostname !== 'localhost';
}

/**
 * Make an HTTP/HTTPS request using native Node modules.
 */
function makeRequest(
  url: URL,
  options: http.RequestOptions,
  body: string,
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const protocol = url.protocol === 'https:' ? https : http;

    const req = protocol.request(url, options, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk: string) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode || 0,
          statusMessage: res.statusMessage || '',
          data,
        });
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * GraphQL adapter that uses node:http/node:https for requests.
 *
 * Handles *.localhost subdomains by rewriting the hostname to "localhost"
 * and injecting the original Host header for server-side subdomain routing.
 */
export class NodeHttpAdapter implements GraphQLAdapter {
  private headers: Record<string, string>;
  private url: URL;

  constructor(
    private endpoint: string,
    headers?: Record<string, string>,
  ) {
    this.headers = headers ?? {};
    this.url = new URL(endpoint);
  }

  async execute<T>(
    document: string,
    variables?: Record<string, unknown>,
  ): Promise<QueryResult<T>> {
    const requestUrl = new URL(this.url.href);
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...this.headers,
    };

    // For *.localhost subdomains, rewrite hostname and inject Host header
    if (isLocalhostSubdomain(requestUrl.hostname)) {
      requestHeaders['Host'] = requestUrl.host;
      requestUrl.hostname = 'localhost';
    }

    const body = JSON.stringify({
      query: document,
      variables: variables ?? {},
    });

    const requestOptions: http.RequestOptions = {
      method: 'POST',
      headers: requestHeaders,
    };

    const response = await makeRequest(requestUrl, requestOptions, body);

    if (response.statusCode < 200 || response.statusCode >= 300) {
      return {
        ok: false,
        data: null,
        errors: [
          {
            message: `HTTP ${response.statusCode}: ${response.statusMessage}`,
          },
        ],
      };
    }

    const json = JSON.parse(response.data) as {
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
