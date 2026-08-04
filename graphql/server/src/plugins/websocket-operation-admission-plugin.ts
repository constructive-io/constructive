import type { Request } from 'express';
import {
  type GraphileCacheEntry,
  isEntryRealtimeUnavailable,
  retireGraphileCacheEntry,
  revalidateEntryRealtimeRole
} from 'graphile-cache';
import type { GraphileConfig } from 'graphile-config';
import { GraphQLError } from 'graphql';

import { inspectCaptchaOperation } from '../middleware/captcha';
import { ensureRuntimeRoleSafety } from '../middleware/runtime-role-safety';

export const GRAPHILE_WEBSOCKET_OPERATION_SAFETY_CODE =
  'GRAPHILE_WEBSOCKET_OPERATION_SAFETY_FAILED';
export const GRAPHILE_WEBSOCKET_CAPTCHA_REQUIRED_CODE = 'CAPTCHA_REQUIRED';

export interface GraphileWebSocketOperationContract {
  cacheKey: string;
  databaseId: string;
  databaseName: string;
  apiId: string;
  schemas: readonly string[];
  authenticatedRole: string;
  anonymousRole: string;
  dependencySchemas: readonly string[];
  runtimeSafetyRequired: boolean;
}

interface OperationAdmissionDependencies {
  ensureRuntimeSafety(entry: GraphileCacheEntry): Promise<void>;
  revalidateRealtimeRole(entry: GraphileCacheEntry): Promise<boolean>;
  retire(entry: GraphileCacheEntry, error: unknown): boolean;
}

export interface GraphileWebSocketOperationAdmission {
  readonly plugin: GraphileConfig.Plugin;
  bind(entry: GraphileCacheEntry): void;
}

const sameStrings = (
  left: readonly string[] | undefined,
  right: readonly string[]
): boolean => Boolean(
  left
  && left.length === right.length
  && left.every((value, index) => value === right[index])
);

const operationRequest = (event: {
  ctx?: { extra?: unknown };
}): Request | undefined => {
  const extra = event.ctx?.extra as { request?: Request } | undefined;
  return extra?.request;
};

const requestMatchesContract = (
  request: Request,
  entry: GraphileCacheEntry,
  contract: Readonly<GraphileWebSocketOperationContract>
): boolean => {
  const api = request.api;
  return Boolean(
    api
    && (api.databaseId ?? '') === contract.databaseId
    && api.dbname === contract.databaseName
    && (api.apiId ?? '') === contract.apiId
    && api.roleName === contract.authenticatedRole
    && api.anonRole === contract.anonymousRole
    && sameStrings(api.schema, contract.schemas)
    && entry.cacheKey === contract.cacheKey
    && entry.websocketSockets?.has(request.socket)
  );
};

const unavailable = (): readonly GraphQLError[] => [
  new GraphQLError('WebSocket operation safety could not be verified', {
    extensions: { code: GRAPHILE_WEBSOCKET_OPERATION_SAFETY_CODE }
  })
];

const captchaRequired = (): readonly GraphQLError[] => [
  new GraphQLError('CAPTCHA-protected mutations must use the HTTP endpoint', {
    extensions: { code: GRAPHILE_WEBSOCKET_CAPTCHA_REQUIRED_CODE }
  })
];

const defaultDependencies = (
  contract: Readonly<GraphileWebSocketOperationContract>
): OperationAdmissionDependencies => ({
  ensureRuntimeSafety: async (entry) => {
    if (!contract.runtimeSafetyRequired) return;
    const pool = entry.poolLease?.pool;
    if (!pool) {
      throw new Error('Resident Graphile generation has no retained runtime pool');
    }
    await ensureRuntimeRoleSafety(
      pool,
      [contract.anonymousRole, contract.authenticatedRole],
      [...contract.schemas],
      [...contract.dependencySchemas]
    );
  },
  revalidateRealtimeRole: revalidateEntryRealtimeRole,
  retire: retireGraphileCacheEntry
});

/**
 * Bind Grafserv's per-operation WebSocket hook to one exact cache generation.
 * The initial HTTP upgrade admission remains authoritative for routing and
 * authentication; this hook prevents a long-lived socket from bypassing later
 * role or listener-attestation checks when it starts another operation.
 */
export const createGraphileWebSocketOperationAdmission = (
  contract: Readonly<GraphileWebSocketOperationContract>,
  dependencies: OperationAdmissionDependencies = defaultDependencies(contract)
): GraphileWebSocketOperationAdmission => {
  const expected = Object.freeze({
    ...contract,
    schemas: Object.freeze([...contract.schemas]),
    dependencySchemas: Object.freeze([...contract.dependencySchemas])
  });
  let entry: GraphileCacheEntry | null = null;

  const reject = (error: unknown): readonly GraphQLError[] => {
    if (entry) dependencies.retire(entry, error);
    return unavailable();
  };

  const plugin: GraphileConfig.Plugin = {
    name: 'ConstructiveWebSocketOperationAdmissionPlugin',
    version: '1.0.0',
    grafserv: {
      middleware: {
        onSubscribe: {
          callback: async (next, event) => {
            const current = entry;
            const request = operationRequest(event);
            if (!current || !request) {
              return reject(new Error('WebSocket operation has no bound generation'));
            }
            if (
              request.aborted
              || request.socket.destroyed
              || current.disposing
            ) {
              return unavailable();
            }
            if (!requestMatchesContract(request, current, expected)) {
              return reject(new Error(
                'WebSocket operation request does not match its bound generation'
              ));
            }

            if (request.api?.authSettings?.enableCaptcha) {
              const message = (event as {
                message?: {
                  payload?: { query?: unknown; operationName?: unknown };
                };
              }).message;
              const inspection = inspectCaptchaOperation(
                message?.payload?.query,
                message?.payload?.operationName
              );
              // CAPTCHA tokens are verified by the HTTP middleware. Protected
              // mutations and documents we cannot classify never reach GraphQL
              // over WebSocket, so a transport switch cannot bypass the gate.
              if (inspection.kind !== 'not-protected') return captchaRequired();
            }

            try {
              await dependencies.ensureRuntimeSafety(current);
              const attested = await dependencies.revalidateRealtimeRole(current);
              if (!attested || isEntryRealtimeUnavailable(current)) {
                throw new Error(
                  'WebSocket operation listener-role attestation is unavailable'
                );
              }
            } catch (error) {
              return reject(error);
            }

            // Schema invalidation or broker failure may retire the generation
            // while either asynchronous audit is running.
            if (
              request.aborted
              || request.socket.destroyed
              || current.disposing
              || isEntryRealtimeUnavailable(current)
            ) {
              return unavailable();
            }
            return next();
          }
        }
      }
    }
  };

  return Object.freeze({
    plugin,
    bind(candidate: GraphileCacheEntry): void {
      if (candidate.cacheKey !== expected.cacheKey) {
        throw new Error('WebSocket operation admission cache key mismatch');
      }
      if (entry && entry !== candidate) {
        throw new Error('WebSocket operation admission is already bound');
      }
      entry = candidate;
    }
  });
};
