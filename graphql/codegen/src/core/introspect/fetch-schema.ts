/**
 * Fetch GraphQL schema introspection from an endpoint
 */
import dns from 'node:dns';
import { Agent, fetch } from 'undici';
import { SCHEMA_INTROSPECTION_QUERY } from './schema-query';
import type { IntrospectionQueryResponse } from '../../types/introspection';

/**
 * Check if a hostname is localhost or a localhost subdomain
 */
function isLocalhostHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname.endsWith('.localhost');
}

/**
 * Create an undici Agent that resolves *.localhost to 127.0.0.1
 * This fixes DNS resolution issues on macOS where subdomains like api.localhost
 * don't resolve automatically (unlike browsers which handle *.localhost).
 */
function createLocalhostAgent(): Agent {
  return new Agent({
    connect: {
      lookup(hostname, opts, cb) {
        if (isLocalhostHostname(hostname)) {
          // When opts.all is true, callback expects an array of {address, family} objects
          // Otherwise it expects (err, address, family)
          if (opts.all) {
            return cb(null, [{ address: '127.0.0.1', family: 4 }]);
          }
          return cb(null, '127.0.0.1', 4);
        }
        dns.lookup(hostname, opts, cb);
      },
    },
  });
}

let localhostAgent: Agent | null = null;

function getLocalhostAgent(): Agent {
  if (!localhostAgent) {
    localhostAgent = createLocalhostAgent();
  }
  return localhostAgent;
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

/**
 * Fetch the full schema introspection from a GraphQL endpoint
 */
export async function fetchSchema(
  options: FetchSchemaOptions
): Promise<FetchSchemaResult> {
  const { endpoint, authorization, headers = {}, timeout = 30000 } = options;

  // Parse the endpoint URL to check for localhost
  const url = new URL(endpoint);
  const useLocalhostAgent = isLocalhostHostname(url.hostname);

  // Build headers
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...headers,
  };

  // Set Host header for localhost subdomains to preserve routing
  if (useLocalhostAgent && url.hostname !== 'localhost') {
    requestHeaders['Host'] = url.hostname;
  }

  if (authorization) {
    requestHeaders['Authorization'] = authorization;
  }

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // Build fetch options with undici-specific dispatcher
  const fetchOptions: any = {
    method: 'POST',
    headers: requestHeaders,
    body: JSON.stringify({
      query: SCHEMA_INTROSPECTION_QUERY,
      variables: {},
    }),
    signal: controller.signal,
  };

  // Use custom agent for localhost to fix DNS resolution on macOS
  if (useLocalhostAgent) {
    fetchOptions.dispatcher = getLocalhostAgent();
  }

  try {
    const response = await fetch(endpoint, fetchOptions);

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        statusCode: response.status,
      };
    }

    const json = (await response.json()) as {
      data?: IntrospectionQueryResponse;
      errors?: Array<{ message: string }>;
    };

    // Check for GraphQL errors
    if (json.errors && json.errors.length > 0) {
      const errorMessages = json.errors.map((e) => e.message).join('; ');
      return {
        success: false,
        error: `GraphQL errors: ${errorMessages}`,
        statusCode: response.status,
      };
    }

    // Check if __schema is present
    if (!json.data?.__schema) {
      return {
        success: false,
        error: 'No __schema field in response. Introspection may be disabled on this endpoint.',
        statusCode: response.status,
      };
    }

    return {
      success: true,
      data: json.data,
      statusCode: response.status,
    };
  } catch (err) {
    clearTimeout(timeoutId);

    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        return {
          success: false,
          error: `Request timeout after ${timeout}ms`,
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
