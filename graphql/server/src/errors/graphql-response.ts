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
import type { Response } from 'express';

/**
 * Send a {@link ConstructiveError} as a GraphQL error response.
 *
 * Uses HTTP 200 by default per the GraphQL-over-HTTP convention. Boundary
 * policies with an explicit transport contract may supply a different status;
 * the error's own `http` hint still travels in `extensions`.
 */
export function respondWithGraphQLError(
  res: Response,
  error: ConstructiveError,
  status = 200
): void {
  res.status(status).json({
    errors: [{ message: error.message, extensions: error.toExtensions() }],
  });
}
