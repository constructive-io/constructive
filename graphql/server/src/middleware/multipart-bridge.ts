import type { RequestHandler } from 'express';

/**
 * Bridge middleware between graphql-upload and grafserv (PostGraphile v5).
 *
 * graphql-upload's `graphqlUploadExpress()` parses multipart/form-data requests
 * and sets `req.body` to a standard GraphQL operation object, but leaves the
 * original Content-Type header unchanged. grafserv rejects any Content-Type it
 * doesn't recognize (415 Unsupported Media Type) because its allowlist only
 * includes `application/json` and `application/graphql`.
 *
 * This middleware rewrites the Content-Type header to `application/json` after
 * graphql-upload has finished parsing, so grafserv accepts the request.
 *
 * This is the standard bridge pattern for grafserv + graphql-upload.
 * See: https://github.com/graphql/graphql-http/discussions/36
 *
 * Must be registered immediately after `graphqlUploadExpress()` in the
 * middleware chain — it relies on graphql-upload having already parsed the
 * multipart body into `req.body`.
 *
 * Security note: multipart/form-data is a CORS "simple request" content type,
 * which means browsers send it without a preflight OPTIONS check. The CSRF risk
 * is mitigated by the CORS middleware that runs before this middleware in the
 * Express pipeline.
 */
export const multipartBridge: RequestHandler = (req, _res, next) => {
  if (req.body != null && req.headers['content-type']?.startsWith('multipart/form-data')) {
    req.headers['content-type'] = 'application/json';
  }
  next();
};
