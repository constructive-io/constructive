/**
 * Fetch GraphQL schema introspection from an endpoint
 */
import { SCHEMA_INTROSPECTION_QUERY } from './schema-query';
import type { IntrospectionQueryResponse } from '../../types/introspection';
import * as http from 'http';
import * as https from 'https';

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
    const url = new URL(endpoint);
    const postData = JSON.stringify({
      query: SCHEMA_INTROSPECTION_QUERY,
      variables: {},
    });

    // Handle localhost subdomains by resolving to IP but preserving Host header
    let hostname = url.hostname;
    let hostHeader = url.hostname;
    
    if (hostname.endsWith('.localhost') || hostname === 'localhost') {
      hostname = '127.0.0.1';
    }

    // Add Host header for subdomain routing
    requestHeaders['Host'] = hostHeader;
    requestHeaders['Content-Length'] = String(Buffer.byteLength(postData));

    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    const { data: responseData, statusCode } = await new Promise<{ data: string; statusCode: number }>((resolve, reject) => {
      const req = lib.request({
        hostname,
        port: url.port ? Number(url.port) : (isHttps ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: requestHeaders,
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode} – ${data}`));
            return;
          }
          resolve({ data, statusCode: res.statusCode || 200 });
        });
      });

      req.on('error', reject);
      req.setTimeout(timeout, () => {
        req.destroy();
        reject(new Error(`Request timeout after ${timeout}ms`));
      });

      req.write(postData);
      req.end();
    });

    clearTimeout(timeoutId);

    const json = JSON.parse(responseData) as {
      data?: IntrospectionQueryResponse;
      errors?: Array<{ message: string }>;
    };

    // Check for GraphQL errors
    if (json.errors && json.errors.length > 0) {
      const errorMessages = json.errors.map((e) => e.message).join('; ');
      return {
        success: false,
        error: `GraphQL errors: ${errorMessages}`,
        statusCode,
      };
    }

    // Check if __schema is present
    if (!json.data?.__schema) {
      return {
        success: false,
        error: 'No __schema field in response. Introspection may be disabled on this endpoint.',
        statusCode,
      };
    }

    return {
      success: true,
      data: json.data,
      statusCode,
    };
  } catch (err) {
    clearTimeout(timeoutId);

    if (err instanceof Error) {
      if (err.message.includes('timeout')) {
        return {
          success: false,
          error: `Request timeout after ${timeout}ms`,
        };
      }
      if (err.message.includes('HTTP')) {
        const match = err.message.match(/HTTP (\d+)/);
        const statusCode = match ? parseInt(match[1]) : 500;
        return {
          success: false,
          error: err.message,
          statusCode,
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
