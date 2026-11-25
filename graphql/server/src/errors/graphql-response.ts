/**
 * GraphQL-over-HTTP error responses.
 *
 * Middleware that short-circuits a GraphQL request (auth, captcha, ...) must
 * still answer with a valid GraphQL response body. Building that body by hand
 * is how a code ends up shipped without a top-level `message`: clients render
 * `errors[].message`, so an error carrying only `extensions.code` surfaces as
 * an empty string. Route every such response through here so the message and
 * extensions both come from the canonical error registry.
 *
 * @module errors/graphql-response
 */

import type { ConstructiveError } from '@constructive-io/errors';
import type { Request, Response } from 'express';

/** Transport-level overrides for a short-circuited response. */
export interface GraphQLErrorResponseInit {
  /** Reference to the logged exception, if one was recorded. */
  errorId?: string;
  /**
   * HTTP status to answer with, when 200 would hide the refusal from the
   * machinery that has to act on it. Admission control is the case that needs
   * it: the operation never reached the schema, and a client's backoff — and
   * every proxy and load balancer between us — reads the status code, not a
   * GraphQL error body.
   */
  status?: number;
  /** Extra headers, e.g. `Retry-After` on a 429. */
  headers?: Record<string, string>;
}

/**
 * Send a {@link ConstructiveError} as a GraphQL error response.
 *
 * Defaults to HTTP 200 per the GraphQL-over-HTTP convention: transport
 * succeeded, the operation did not. The error's own `http` hint travels in
 * `extensions`.
 */
export function respondWithGraphQLError(
  res: Response,
  error: ConstructiveError,
  init: GraphQLErrorResponseInit = {}
): void {
  if (init.headers) res.set(init.headers);
  res.status(init.status ?? 200).json({
    errors: [{
      message: error.message,
      extensions: { ...error.toExtensions(), ...(init.errorId ? { errorId: init.errorId } : {}) }
    }],
  });
}

/**
 * Send a {@link ConstructiveError} from middleware that runs ahead of every
 * route, in the shape the route's callers read.
 *
 * `/graphql` gets the GraphQL response above, unchanged. Every other path
 * (`/v1`, `/fn`, `/upload`, `/flush`, ...) is plain HTTP: its callers branch on
 * the status code, and a 200 carrying a GraphQL error body reads as success.
 * Those get the error's registered status and the JSON error body the error
 * handler already answers them with.
 */
export function respondWithError(
  req: Request,
  res: Response,
  error: ConstructiveError,
  init: GraphQLErrorResponseInit = {}
): void {
  if (req.path === '/graphql') {
    respondWithGraphQLError(res, error, init);
    return;
  }
  if (init.headers) res.set(init.headers);
  res.status(init.status ?? error.http).json({
    error: { code: error.code, message: error.message, requestId: req.requestId },
  });
}
