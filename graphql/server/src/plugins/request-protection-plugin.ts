import '../middleware/types'; // for Request type

import type { RefusalReason } from '@constructive-io/express-context';
import { DEFAULT_REQUEST_PROTECTION } from '@constructive-io/express-context';
import type { Request } from 'express';
import { SafeError } from 'grafast';
import type { GraphileConfig } from 'graphile-config';
import type { ExecutionResult } from 'graphql';
import { GraphQLError } from 'graphql';

import { enforceDocumentProtection } from '../protection/document-gate';
import { recordRefusal } from '../refusals/recorder';

/** The document-gate error codes, as the refusal taxonomy names them. */
const DOCUMENT_REFUSALS: Record<string, RefusalReason> = {
  QUERY_TOO_DEEP: 'query_too_deep',
  QUERY_TOO_COSTLY: 'query_too_costly',
  PAGE_SIZE_TOO_LARGE: 'page_size_too_large'
};

/** The refusal a gate rejection counts as, or undefined for any other error. */
export const documentRefusalReason = (err: unknown): RefusalReason | undefined => {
  if (!(err instanceof SafeError)) return undefined;
  const code = (err.extensions as { code?: unknown } | undefined)?.code;
  return typeof code === 'string' ? DOCUMENT_REFUSALS[code] : undefined;
};

/**
 * Get the Express request from a grafserv request context.
 */
const getExpressRequest = (
  requestContext: Partial<Grafast.RequestContext> | undefined
): Request | undefined => {
  const ctx = requestContext as { expressv4?: { req?: Request }; ws?: { request?: Request } };
  return ctx?.expressv4?.req ?? ctx?.ws?.request;
};

/**
 * Check the operation against the tenant's bounds. Returns the refusal as a
 * GraphQL result, or undefined when the operation may run.
 */
const refuseDocument = (
  args: Pick<
    Grafast.ExecutionArgs,
    'schema' | 'document' | 'variableValues' | 'operationName' | 'requestContext'
  >
): ExecutionResult | undefined => {
  const req = getExpressRequest(args.requestContext);

  // No resolved settings means the protection middleware did not run for
  // this request (an embedded/test harness mounting grafserv directly);
  // the platform defaults still apply rather than nothing at all.
  const protection = req?.requestProtection ?? DEFAULT_REQUEST_PROTECTION;

  if (!args.document || !args.schema) return undefined;

  try {
    enforceDocumentProtection(
      args.schema,
      args.document,
      args.variableValues,
      protection,
      args.operationName
    );
  } catch (err) {
    if (!(err instanceof SafeError)) throw err;
    // Counted on the way out, keyed by the tenant the request resolved.
    const reason = documentRefusalReason(err);
    if (reason && req) recordRefusal(req, reason);
    const { statusCode: _statusCode, ...extensions } = err.extensions ?? {};
    return { errors: [new GraphQLError(err.message, { extensions })] };
  }
  return undefined;
};

/**
 * RequestProtectionPlugin — applies a tenant's document bounds to every
 * operation.
 *
 * The check runs at `execute`/`subscribe` rather than `parseAndValidate`
 * because `parseAndValidate` sees no request, so it could only enforce the
 * bounds baked into the schema's preset at build time — and a Graphile
 * instance is cached per API for as long as the schema is valid, so a tenant
 * lowering a limit would not take effect until the cache turned over. Here the
 * request (hence the freshly resolved settings) and the variables are both
 * available, which is also what makes `first: $n` enforceable.
 *
 * A refusal is returned as the operation's result, not thrown: grafserv
 * reports an error thrown while preparing or executing as HTTP 500 with its
 * `extensions` dropped, so the registered code would never reach the client.
 */
export const RequestProtectionPlugin: GraphileConfig.Plugin = {
  name: 'RequestProtectionPlugin',
  version: '0.0.0',
  description:
    'Enforces per-request query depth, cost, page size and introspection bounds resolved from database_settings/api_settings.',

  grafast: {
    middleware: {
      execute(next, event) {
        return refuseDocument(event.args) ?? next();
      },
      subscribe(next, event) {
        return refuseDocument(event.args) ?? next();
      }
    }
  }
};
