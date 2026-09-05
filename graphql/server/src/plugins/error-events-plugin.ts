import '../middleware/types'; // for Request type

import type { EventsConfig } from '@constructive-io/express-context';
import { Logger } from '@pgpmjs/logger';
import type { Request } from 'express';
import type { GraphileConfig } from 'graphile-config';
import type { GraphQLError } from 'graphql';
import { getOperationAST } from 'graphql';
import { escapeIdentifier, type Pool } from 'pg';
import { withPgClient } from 'pg-query-context';

import { normalizeError } from '../middleware/mask-error';

const log = new Logger('error-events');

export const GRAPHQL_ERROR_EVENT = 'graphql.error';

const getExpressRequest = (
  requestContext: Partial<Grafast.RequestContext> | undefined
): Request | undefined => (requestContext as { expressv4?: { req?: Request } })?.expressv4?.req;

/**
 * The first structured, public-classified registry code among the errors.
 * Internal/unknown errors are bugs, not refusals: they are masked and logged
 * by `maskError` and never recorded as tenant events.
 */
const refusalCode = (errors: readonly GraphQLError[] | undefined): string | undefined => {
  for (const error of errors ?? []) {
    const { code, class: errorClass } = normalizeError(error);
    if (code && errorClass === 'public') return code;
  }
  return undefined;
};

export const recordEventSql = (events: EventsConfig): string =>
  `SELECT ${escapeIdentifier(events.privateSchemaName)}.${escapeIdentifier(events.recordEvent)}($1, $2::uuid, $3::jsonb)`;

/**
 * Records `graphql.error` when an authenticated mutation is refused with a
 * structured registry code. The refusal rolled back the mutation's own
 * transaction, so the event is written afterwards in a fresh transaction under
 * the same request claims, via the tenant's events module `record_event`.
 *
 * The server carries no policy about what a code means: the database reads
 * `payload->>'code'` (e.g. PRINCIPAL_CHILD_WIDENS demoting a principal on the
 * trust ladder). Endpoints without an events module record nothing.
 * Unauthenticated requests are never recorded, so anonymous traffic cannot
 * drive writes. The client response is never altered.
 */
export const createErrorEventsPlugin = (pool: Pool): GraphileConfig.Plugin => ({
  name: 'ErrorEventsPlugin',
  version: '0.0.0',
  description: 'Records graphql.error through the tenant events module when an authenticated mutation is refused.',

  grafast: {
    middleware: {
      async execute(next, event) {
        const result = await next();
        if (Symbol.asyncIterator in result) return result;

        const { args } = event;
        const req = getExpressRequest(args.requestContext);
        const actorId = req?.token?.principal_id ?? req?.token?.user_id;
        if (!actorId) return result;
        if (getOperationAST(args.document, args.operationName)?.operation !== 'mutation') return result;

        const code = refusalCode(result.errors);
        if (!code) return result;

        const pgSettings = (args.contextValue as { pgSettings?: Record<string, string> })?.pgSettings;
        const label = req.requestId ? `[${req.requestId}]` : '[req]';
        try {
          const events = await req.constructive?.useModule('events');
          if (!events || !pgSettings) return result;
          const operation = args.operationName ?? getOperationAST(args.document)?.name?.value ?? null;
          await withPgClient(pool, pgSettings, (client) =>
            client.query(recordEventSql(events), [
              GRAPHQL_ERROR_EVENT,
              actorId,
              JSON.stringify({ code, operation })
            ])
          );
        } catch (err) {
          log.error(
            `${label} failed to record ${GRAPHQL_ERROR_EVENT} (${code}) for ${actorId}: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
        }
        return result;
      }
    }
  }
});
