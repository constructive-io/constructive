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
 * Uses HTTP 200 per the GraphQL-over-HTTP convention: transport succeeded, the
 * operation did not. The error's own `http` hint travels in `extensions`.
 */
export function respondWithGraphQLError(
  res: Response,
  error: ConstructiveError
): void {
  res.status(200).json({
    errors: [{ message: error.message, extensions: error.toExtensions() }],
  });
}
