/**
 * Fetch GraphQL schema introspection from an endpoint
 */
import { SCHEMA_INTROSPECTION_QUERY } from './schema-query';
import type { IntrospectionQueryResponse } from '../../types/introspection';

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

  // Build headers
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...headers,
  };

  if (authorization) {
    requestHeaders['Authorization'] = authorization;
  }

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify({
        query: SCHEMA_INTROSPECTION_QUERY,
        variables: {},
      }),
      signal: controller.signal,
    });

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
