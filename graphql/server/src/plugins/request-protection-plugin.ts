import '../middleware/types'; // for Request type

import type { RefusalReason } from '@constructive-io/express-context';
import { DEFAULT_REQUEST_PROTECTION } from '@constructive-io/express-context';
import type { Request } from 'express';
import { SafeError } from 'grafast';
import type { GraphileConfig } from 'graphile-config';

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
): Request | undefined => (requestContext as { expressv4?: { req?: Request } })?.expressv4?.req;

/**
 * RequestProtectionPlugin — applies a tenant's document bounds to every
 * operation.
 *
 * The check runs in `prepareArgs` rather than `parseAndValidate` for one
 * reason: `parseAndValidate` sees no request, so it could only enforce the
 * bounds baked into the schema's preset at build time — and a Graphile
 * instance is cached per API for as long as the schema is valid, so a tenant
 * lowering a limit would not take effect until the cache turned over.
 * `prepareArgs` carries both the request (hence the freshly resolved settings)
 * and the coerced variables, which is also what makes `first: $n` enforceable.
 */
export const RequestProtectionPlugin: GraphileConfig.Plugin = {
  name: 'RequestProtectionPlugin',
  version: '0.0.0',
  description:
    'Enforces per-request query depth, cost, page size and introspection bounds resolved from database_settings/api_settings.',

  grafast: {
    middleware: {
      prepareArgs(next, event) {
        const { args } = event;
        const req = getExpressRequest(args.requestContext);

        // No resolved settings means the protection middleware did not run for
        // this request (an embedded/test harness mounting grafserv directly);
        // the platform defaults still apply rather than nothing at all.
        const protection = req?.requestProtection ?? DEFAULT_REQUEST_PROTECTION;

        if (args.document && args.schema) {
          try {
            enforceDocumentProtection(
              args.schema,
              args.document,
              args.variableValues,
              protection,
              args.operationName
            );
          } catch (err) {
            // The rejection is still the client's `SafeError`; it is counted on
            // the way out, keyed by the tenant the request resolved.
            const reason = documentRefusalReason(err);
            if (reason && req) recordRefusal(req, reason);
            throw err;
          }
        }

        return next();
      }
    }
  }
};
