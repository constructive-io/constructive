export interface GraphQLExecuteInput {
  endpoint: string;
  document: string;
  variables?: Record<string, unknown>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export interface GraphQLResponseError {
  message: string;
  path?: Array<string | number>;
  extensions?: Record<string, unknown>;
}

export interface GraphQLExecuteResult {
  ok: boolean;
  data: unknown;
  errors?: GraphQLResponseError[];
}

export interface GraphQLExecutor {
  execute(input: GraphQLExecuteInput): Promise<GraphQLExecuteResult>;
}

export class FetchGraphQLExecutor implements GraphQLExecutor {
  async execute(input: GraphQLExecuteInput): Promise<GraphQLExecuteResult> {
    const response = await fetch(input.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(input.headers || {}),
      },
      body: JSON.stringify({
        query: input.document,
        variables: input.variables || {},
      }),
      signal: input.signal,
    });

    if (!response.ok) {
      return {
        ok: false,
        data: null,
        errors: [
          {
            message: `HTTP ${response.status}: ${response.statusText}`,
          },
        ],
      };
    }

    const json = (await response.json()) as {
      data?: unknown;
      errors?: GraphQLResponseError[];
    };

    if (json.errors && json.errors.length > 0) {
      return {
        ok: false,
        data: json.data || null,
        errors: json.errors,
      };
    }

    return {
      ok: true,
      data: json.data || null,
    };
  }
}
