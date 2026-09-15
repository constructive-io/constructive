/**
 * The GraphQL transport, kept behind one function so the store never knows how
 * a host authenticates.
 *
 * The run surface lives in the tenant's own database, so this addresses the
 * tenant API endpoint the platform UI already resolves per database, with the
 * user's bearer token — the reader is the user, RLS decides what a run shows,
 * and no service credential is involved anywhere in this lane.
 */

export type GraphqlRequest = <T>(
  query: string,
  variables?: Record<string, unknown>
) => Promise<T>;

export interface GraphqlTransportOptions {
  endpoint: string;
  /** Resolved per call, so a rotated token is picked up without rebuilding. */
  headers?: () => Record<string, string>;
  fetch?: typeof globalThis.fetch;
  signal?: AbortSignal;
}

interface GraphqlError {
  message: string;
}

interface GraphqlBody<T> {
  data?: T;
  errors?: GraphqlError[];
}

/**
 * A GraphQL error is thrown, never folded into an empty page: a transcript that
 * failed to load and a run with no events look identical to a renderer, and the
 * second is a lie a user cannot detect.
 */
export function createGraphqlRequest(
  options: GraphqlTransportOptions
): GraphqlRequest {
  const doFetch = options.fetch ?? globalThis.fetch;
  if (!doFetch) {
    throw new Error('run-log-client needs a fetch implementation');
  }
  return async <T>(query: string, variables?: Record<string, unknown>) => {
    const res = await doFetch(options.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers ? options.headers() : {}),
      },
      body: JSON.stringify({ query, variables: variables ?? {} }),
      signal: options.signal,
    });
    if (!res.ok) {
      throw new Error(
        `run log request failed: ${res.status} ${await res.text()}`
      );
    }
    const body = (await res.json()) as GraphqlBody<T>;
    if (body.errors && body.errors.length > 0) {
      throw new Error(
        `run log request failed: ${body.errors.map((e) => e.message).join('; ')}`
      );
    }
    if (!body.data) {
      throw new Error('run log request returned no data');
    }
    return body.data;
  };
}
