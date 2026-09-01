import '../middleware/types'; // for Request type

import { DEFAULT_REQUEST_PROTECTION } from '@constructive-io/express-context';
import type { Request } from 'express';
import type { GraphileConfig } from 'graphile-config';

import { enforceDocumentProtection } from '../protection/document-gate';

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
          enforceDocumentProtection(
            args.schema,
            args.document,
            args.variableValues,
            protection,
            args.operationName
          );
        }

        return next();
      }
    }
  }
};
