/**
 * Fetch GraphQL schema introspection from an endpoint
 * Uses native Node.js http/https modules
 */
import http from 'node:http';
import https from 'node:https';

import type { IntrospectionQueryResponse } from '../../types/introspection';
import { SCHEMA_INTROSPECTION_QUERY } from './schema-query';

interface HttpResponse {
  statusCode: number;
  statusMessage: string;
  data: string;
  headers: http.IncomingHttpHeaders;
}

/**
 * Make an HTTP/HTTPS request using native Node modules
 */
function makeRequest(
  url: URL,
  options: http.RequestOptions,
  body: string,
  timeout: number,
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
          headers: res.headers,
        });
      });
    });

    req.on('error', reject);

    req.setTimeout(timeout, () => {
      req.destroy();
      reject(new Error(`Request timeout after ${timeout}ms`));
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
}

export interface FetchSchemaResult {
  success: boolean;
  data?: IntrospectionQueryResponse;
  error?: string;
  statusCode?: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

const truncate = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
};

const safeStringify = (value: unknown): string => {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const toSingleHeaderValue = (value: string | string[] | undefined): string => {
  if (!value) {
    return '';
  }

  if (Array.isArray(value)) {
    return value.join(', ');
  }

  return value;
};

const summarizeGraphQLError = (entry: unknown, index: number): string => {
  if (typeof entry === 'string' && entry.trim().length > 0) {
    return entry.trim();
  }

  if (!isRecord(entry)) {
    return `error_${index + 1}`;
  }

  const message =
    typeof entry.message === 'string' && entry.message.trim().length > 0
      ? entry.message.trim()
      : undefined;
  const code =
    isRecord(entry.extensions) && typeof entry.extensions.code === 'string'
      ? entry.extensions.code
      : undefined;

  if (message && code) {
    return `${message} (code=${code})`;
  }
  if (message) {
    return message;
  }
  if (code) {
    return code;
  }

  return truncate(safeStringify(entry), 200);
};

/**
 * Fetch the full schema introspection from a GraphQL endpoint
 */
export async function fetchSchema(
  options: FetchSchemaOptions,
): Promise<FetchSchemaResult> {
  const { endpoint, authorization, headers = {}, timeout = 30000 } = options;

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
    const response = await makeRequest(url, requestOptions, body, timeout);

    if (response.statusCode < 200 || response.statusCode >= 300) {
      const bodySnippet = truncate(response.data.trim(), 200);
      return {
        success: false,
        error:
          bodySnippet.length > 0
            ? `HTTP ${response.statusCode}: ${response.statusMessage}. Response body: ${bodySnippet}`
            : `HTTP ${response.statusCode}: ${response.statusMessage}`,
        statusCode: response.statusCode,
      };
    }

    let json: {
      data?: IntrospectionQueryResponse;
      errors?: unknown[];
    };
    try {
      json = JSON.parse(response.data) as {
        data?: IntrospectionQueryResponse;
        errors?: unknown[];
      };
    } catch {
      const contentType = toSingleHeaderValue(response.headers['content-type']);
      const bodySnippet = truncate(response.data.trim(), 200);
      return {
        success: false,
        error: `Invalid JSON response from GraphQL endpoint (content-type: ${contentType || 'unknown'}). Body: ${bodySnippet || '[empty]'}`,
        statusCode: response.statusCode,
      };
    }

    if (json.errors && json.errors.length > 0) {
      const errorMessages = json.errors
        .map((entry, index) => summarizeGraphQLError(entry, index))
        .filter((message) => message.length > 0)
        .join('; ');
      return {
        success: false,
        error: `GraphQL errors: ${errorMessages || 'Unknown GraphQL error'}`,
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
          error: `Connection refused - is the server running at ${endpoint}?`,
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
          error: `Connection reset by server at ${endpoint}`,
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
