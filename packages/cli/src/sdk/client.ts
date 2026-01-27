/**
 * Simple GraphQL client for the CNC execution engine
 * Uses native fetch - no external dependencies
 */

export interface GraphQLError {
  message: string;
  locations?: Array<{ line: number; column: number }>;
  path?: Array<string | number>;
  extensions?: Record<string, unknown>;
}

export interface QueryResult<T> {
  ok: boolean;
  data: T | null;
  errors?: GraphQLError[];
}

export interface ClientConfig {
  endpoint: string;
  headers?: Record<string, string>;
}

/**
 * Execute a GraphQL query/mutation against an endpoint
 */
export async function executeGraphQL<T>(
  endpoint: string,
  query: string,
  variables?: Record<string, unknown>,
  headers?: Record<string, string>
): Promise<QueryResult<T>> {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...headers,
      },
      body: JSON.stringify({
        query,
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
        data: json.data ?? null,
        errors: json.errors,
      };
    }

    return {
      ok: true,
      data: json.data as T,
    };
  } catch (error) {
    return {
      ok: false,
      data: null,
      errors: [
        {
          message:
            error instanceof Error ? error.message : 'Unknown error occurred',
        },
      ],
    };
  }
}

/**
 * Create a configured client for a specific endpoint
 */
export function createClient(config: ClientConfig) {
  return {
    execute: <T>(
      query: string,
      variables?: Record<string, unknown>
    ): Promise<QueryResult<T>> => {
      return executeGraphQL<T>(config.endpoint, query, variables, config.headers);
    },
    config,
  };
}
