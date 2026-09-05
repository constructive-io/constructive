import '../middleware/types'; // for Request type

import { Logger } from '@pgpmjs/logger';
import type { Request } from 'express';
import type { GraphileConfig } from 'graphile-config';
import type { GraphQLError } from 'graphql';
import { getOperationAST } from 'graphql';
import type { Pool } from 'pg';
import { withPgClient } from 'pg-query-context';

import { normalizeError } from '../middleware/mask-error';

const log = new Logger('widening-refused');

export const WIDENING_REFUSED_EVENT = 'principal.widening_refused';

/** Refusals that count as an agent trying to widen its own reach. */
const WIDENING_CODES = new Set(['PRINCIPAL_CHILD_WIDENS']);

const getExpressRequest = (
  requestContext: Partial<Grafast.RequestContext> | undefined
): Request | undefined => (requestContext as { expressv4?: { req?: Request } })?.expressv4?.req;

const wideningCode = (errors: readonly GraphQLError[] | undefined): string | undefined => {
  for (const error of errors ?? []) {
    const { code } = normalizeError(error);
    if (code && WIDENING_CODES.has(code)) return code;
  }
  return undefined;
};

/**
 * Records `principal.widening_refused` for the principal whose mutation was
 * refused with a widening code. The refusal itself rolled back the mutation's
 * transaction, so the event is written afterwards in a fresh transaction under
 * the same request claims, via the tenant's own events module `record_event`.
 * Only principals are on the agent trust ladder: a human refused by the same
 * code records nothing. The client response is never altered.
 */
export const createWideningRefusedPlugin = (pool: Pool): GraphileConfig.Plugin => ({
  name: 'WideningRefusedPlugin',
  version: '0.0.0',
  description: 'Records principal.widening_refused after a mutation is refused with PRINCIPAL_CHILD_WIDENS.',

  grafast: {
    middleware: {
      async execute(next, event) {
        const result = await next();
        if (Symbol.asyncIterator in result) return result;

        const { args } = event;
        const req = getExpressRequest(args.requestContext);
        const principalId = req?.token?.principal_id;
        if (!principalId) return result;
        if (getOperationAST(args.document, args.operationName)?.operation !== 'mutation') return result;

        const code = wideningCode(result.errors);
        if (!code) return result;

        const pgSettings = (args.contextValue as { pgSettings?: Record<string, string> })?.pgSettings;
        const label = req.requestId ? `[${req.requestId}]` : '[req]';
        try {
          const events = await req.constructive?.useModule('events');
          if (!events || !pgSettings) return result;
          const operation = args.operationName ?? getOperationAST(args.document)?.name?.value ?? null;
          await withPgClient(pool, pgSettings, (client) =>
            client.query(`SELECT "${events.privateSchemaName}"."${events.recordEvent}"($1, $2::uuid, $3::jsonb)`, [
              WIDENING_REFUSED_EVENT,
              principalId,
              JSON.stringify({ code, operation })
            ])
          );
        } catch (err) {
          log.error(
            `${label} failed to record ${WIDENING_REFUSED_EVENT} for principal ${principalId}: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
        }
        return result;
      }
    }
  }
});
