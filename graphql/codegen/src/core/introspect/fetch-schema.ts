/**
 * Fetch GraphQL schema introspection from an endpoint
 * Uses native Node.js http/https modules
 */
import http from 'node:http';
import https from 'node:https';

import type { IntrospectionQueryResponse } from '../../types/introspection';
import {
  getAbortReason,
  rethrowIfCancelled,
  throwIfAborted,
} from '../cancellation';
import { endpointForDisplay } from '../sensitive-values';
import { SCHEMA_INTROSPECTION_QUERY } from './schema-query';

interface HttpResponse {
  statusCode: number;
  statusMessage: string;
  data: string;
}

/**
 * Make an HTTP/HTTPS request using native Node modules
 */
function makeRequest(
  url: URL,
  options: http.RequestOptions,
  body: string,
  timeout: number,
  signal?: AbortSignal
): Promise<HttpResponse> {
  throwIfAborted(signal);

  return new Promise((resolve, reject) => {
    const protocol = url.protocol === 'https:' ? https : http;
    let settled = false;
    let req!: http.ClientRequest;

    const cleanup = (): void => {
      signal?.removeEventListener('abort', onAbort);
    };
    const succeed = (value: HttpResponse): void => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    };
    const fail = (reason: unknown): void => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(reason);
    };

    const onAbort = (): void => {
      const reason = getAbortReason(signal!);
      // Destroy the request/socket immediately, while rejecting with the exact
      // caller-owned reason (which is not necessarily an Error instance).
      req.destroy(reason instanceof Error ? reason : undefined);
      fail(reason);
    };

    req = protocol.request(url, options, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk: string) => {
        data += chunk;
      });
      res.on('end', () => {
        succeed({
          statusCode: res.statusCode || 0,
          statusMessage: res.statusMessage || '',
          data,
        });
      });
    });

    req.on('error', (error) => {
      fail(signal?.aborted ? getAbortReason(signal) : error);
    });

    signal?.addEventListener('abort', onAbort, { once: true });
    if (signal?.aborted) {
      onAbort();
      return;
    }

    req.setTimeout(timeout, () => {
      const error = new Error(`Request timeout after ${timeout}ms`);
      req.destroy(error);
      fail(error);
    });

    req.write(body);
    req.end();
  });
}

export interface FetchSchemaOptions {
  /** GraphQL endpoint URL */
  endpoint: string;
  /** Optional authorization header value (e.g., "Bearer token") */
  authorization?: string;
  /** Optional additional headers */
  headers?: Record<string, string>;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Cancels an in-flight introspection request and destroys its socket. */
  signal?: AbortSignal;
}

export interface FetchSchemaResult {
  success: boolean;
  data?: IntrospectionQueryResponse;
  error?: string;
  statusCode?: number;
}

/**
 * Fetch the full schema introspection from a GraphQL endpoint
 */
export async function fetchSchema(
  options: FetchSchemaOptions
): Promise<FetchSchemaResult> {
  const {
    endpoint,
    authorization,
    headers = {},
    timeout = 30000,
    signal,
  } = options;
  const displayEndpoint = endpointForDisplay(endpoint);

  throwIfAborted(signal);

  const url = new URL(endpoint);

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...headers,
  };

  if (authorization) {
    requestHeaders['Authorization'] = authorization;
  }

  const body = JSON.stringify({
    query: SCHEMA_INTROSPECTION_QUERY,
    variables: {},
  });

  const requestOptions: http.RequestOptions = {
    method: 'POST',
    headers: requestHeaders,
  };

  try {
    const response = await makeRequest(
      url,
      requestOptions,
      body,
      timeout,
      signal
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      return {
        success: false,
        error: `HTTP ${response.statusCode}: ${response.statusMessage}`,
        statusCode: response.statusCode,
      };
    }

    const json = JSON.parse(response.data) as {
      data?: IntrospectionQueryResponse;
      errors?: Array<{ message: string }>;
    };

    if (json.errors && json.errors.length > 0) {
      const errorMessages = json.errors.map((e) => e.message).join('; ');
      return {
        success: false,
        error: `GraphQL errors: ${errorMessages}`,
        statusCode: response.statusCode,
      };
    }

    if (!json.data?.__schema) {
      return {
        success: false,
        error:
          'No __schema field in response. Introspection may be disabled on this endpoint.',
        statusCode: response.statusCode,
      };
    }

    return {
      success: true,
      data: json.data,
      statusCode: response.statusCode,
    };
  } catch (err) {
    rethrowIfCancelled(err, signal);
    if (err instanceof Error) {
      if (err.message.includes('timeout')) {
        return {
          success: false,
          error: `Request timeout after ${timeout}ms`,
        };
      }

      const errorCode = (err as NodeJS.ErrnoException).code;
      if (errorCode === 'ECONNREFUSED') {
        return {
          success: false,
          error: `Connection refused - is the server running at ${displayEndpoint}?`,
        };
      }
      if (errorCode === 'ENOTFOUND') {
        return {
          success: false,
          error: `DNS lookup failed for ${url.hostname} - check the endpoint URL`,
        };
      }
      if (errorCode === 'ECONNRESET') {
        return {
          success: false,
          error: `Connection reset by server at ${displayEndpoint}`,
        };
      }

      return {
        success: false,
        error: err.message,
      };
    }

    return {
      success: false,
      error: 'Unknown error occurred',
    };
  }
}
