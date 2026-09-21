// The GraphQL client, as a value.
//
// A resource workload holds no database connection: everything it does to the
// conversation goes through the tenant's GraphQL API with an access token. The
// library takes the smallest possible client — one `request` — so a suite hands
// it a fake and the code task hands it a fetch-backed one.

/** The one call this library needs from a GraphQL client. */
export interface GraphQLClient {
  request<T>(query: string, variables?: Record<string, unknown>): Promise<T>;
}

/** `fetch` as this module uses it — injectable so a suite can serve a fake API. */
export type FetchLike = (
  input: string,
  init: { method: string; headers: Record<string, string>; body?: string }
) => Promise<{ ok: boolean; status: number; text: () => Promise<string> }>;

export interface HttpGraphQLClientOptions {
  url: string;
  /** Access token for the tenant API; sent as a bearer token. */
  token: string;
  /** Extra headers — the identity headers a metered call carries, for instance. */
  headers?: Record<string, string>;
  fetch?: FetchLike;
}

/** Raised when the API answers non-2xx or the response carries GraphQL errors. */
export class GraphQLRequestError extends Error {
  constructor(
    readonly operation: string,
    readonly status: number,
    readonly detail: string
  ) {
    super(`GraphQL ${operation} failed (${status}): ${detail}`);
    this.name = 'GraphQLRequestError';
  }
}

function operationName(query: string): string {
  return /(?:query|mutation)\s+(\w+)/.exec(query)?.[1] ?? 'anonymous';
}

export function createHttpGraphQLClient(options: HttpGraphQLClientOptions): GraphQLClient {
  const fetchImpl = options.fetch ?? (globalThis.fetch as unknown as FetchLike);
  if (!fetchImpl) throw new Error('GraphQL client needs a fetch implementation');
  if (!options.url) throw new Error('GraphQL client needs a URL');
  if (!options.token) throw new Error('GraphQL client needs an access token');

  return {
    async request<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
      const res = await fetchImpl(options.url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${options.token}`,
          ...options.headers,
        },
        body: JSON.stringify({ query, variables }),
      });
      const body = await res.text();
      const name = operationName(query);
      if (!res.ok) throw new GraphQLRequestError(name, res.status, body || '(empty body)');
      const parsed = JSON.parse(body) as { data?: T; errors?: Array<{ message: string }> };
      if (parsed.errors?.length) {
        throw new GraphQLRequestError(name, res.status, parsed.errors.map((e) => e.message).join('; '));
      }
      if (!parsed.data) throw new GraphQLRequestError(name, res.status, 'response carried no data');
      return parsed.data;
    },
  };
}
