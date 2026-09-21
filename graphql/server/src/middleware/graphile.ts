import './types'; // for Request type

import { errors } from '@constructive-io/errors';
import { DEFAULT_REQUEST_PROTECTION, protectionPgSettings } from '@constructive-io/express-context';
import type { ConstructiveOptions } from '@constructive-io/graphql-types';
import { getNodeEnv } from '@pgpmjs/env';
import { Logger } from '@pgpmjs/logger';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import {
  createGraphileBuildCacheKey,
  createGraphileInstance,
  graphileCache,
  snapshotGraphileBuildValue,
  type GraphileCacheEntry
} from 'graphile-cache';
import type { GraphileConfig } from 'graphile-config';
import { createFunctionBindingsPlugin } from 'graphile-function-bindings';
import { createConstructivePreset, createGrafastCacheLimitsPreset } from 'graphile-settings';
import { getPgPool } from 'pg-cache';
import { getPgEnvOptions } from 'pg-env';

import { isGraphqlObservabilityEnabled } from '../diagnostics/observability';
import { HandlerCreationError } from '../errors/api-errors';
import { respondWithGraphQLError } from '../errors/graphql-response';
import { AuthCookiePlugin } from '../plugins/auth-cookie-plugin';
import { createErrorEventsPlugin } from '../plugins/error-events-plugin';
import { RequestProtectionPlugin } from '../plugins/request-protection-plugin';
import { makeIntrospectionWiring } from './graphile-introspection';
import { maskError } from './mask-error';
import { observeGraphileBuild } from './observability/graphile-build-stats';
import { createGraphileServerBuildSnapshot } from './graphile-build-snapshot';

const isDev = (): boolean => getNodeEnv() === 'development';

// =============================================================================
// Single-Flight Pattern: In-Flight Tracking
// =============================================================================

/**
 * Tracks in-flight handler creation promises to prevent duplicate creations.
 * When multiple concurrent requests arrive for the same cache key, only the
 * first request creates the handler while others wait on the same promise.
 */
const creating = new Map<string, Promise<GraphileCacheEntry>>();

/**
 * Returns the number of currently in-flight handler creation operations.
 * Useful for monitoring and debugging.
 */
export function getInFlightCount(): number {
  return creating.size;
}

/**
 * Returns the cache keys for all currently in-flight handler creation operations.
 * Useful for monitoring and debugging.
 */
export function getInFlightKeys(): string[] {
  return [...creating.keys()];
}

/**
 * Clears the in-flight map. Used for testing purposes.
 */
export function clearInFlightMap(): void {
  creating.clear();
}

const log = new Logger('graphile');
const reqLabel = (req: Request): string => (req.requestId ? `[${req.requestId}]` : '[req]');

/**
 * Build a PostGraphile v5 preset for a tenant.
 *
 * When `databaseSettings` are available the flags are forwarded to
 * `createConstructivePreset()` which conditionally includes each
 * plugin preset.  Without settings the default preset is used
 * (everything on except aggregates).
 */
const buildPreset = async (
  snapshot: ReturnType<typeof createGraphileServerBuildSnapshot>,
  pool: import('pg').Pool
): Promise<GraphileConfig.Preset> => {
  const introspection = await makeIntrospectionWiring(pool, snapshot.schemas, snapshot.graphileOptions, undefined, snapshot.introspectionRole);
  const configuredPreset = snapshot.graphileOptions?.preset ?? {};
  const grafastCachePreset = createGrafastCacheLimitsPreset(snapshot.graphileOptions?.grafastCache);
  return {
    ...configuredPreset,
    extends: [
      createConstructivePreset(snapshot.databaseSettings),
      ...(snapshot.graphileOptions?.extends ?? []),
      ...(configuredPreset.extends ?? []),
      ...introspection.presets,
      ...(Object.keys(grafastCachePreset).length > 0 ? [grafastCachePreset] : [])
    ],
    plugins: [
      ...(configuredPreset.plugins ?? []),
      AuthCookiePlugin,
      RequestProtectionPlugin,
      createErrorEventsPlugin(pool),
      // Only registered when the compute module is provisioned for this
      // database — all schema/table names come from the constructive
      // metaschema (express-context compute module loader); the plugin has
      // no fallbacks or discovery of its own.
      ...(snapshot.apiId && snapshot.computeModules.length
        ? [
          createFunctionBindingsPlugin({
            apiId: snapshot.apiId,
            modules: snapshot.computeModules.map((m) => ({
              computeSchema: m.schemaName,
              bindingsTable: m.bindingsTableName,
              definitionsTable: m.definitionsTableName,
              invocationsSchema: m.invocationsSchemaName,
              invocationsTable: m.invocationsTableName,
              invocationsEntityField: m.invocationsEntityField
            }))
          })
        ]
        : [])
    ],
    pgServices: [introspection.pgService],
    grafserv: snapshot.grafserv,
    grafast: {
      explain: snapshot.explain,
      context: (requestContext: Partial<Grafast.RequestContext>) => {
      // In grafserv/express/v4, the request is available at requestContext.expressv4.req
        const req = (requestContext as { expressv4?: { req?: Request } })?.expressv4?.req;
        const context: Record<string, string> = {};

        // Timeouts travel with the transaction as GUCs, so they bound the work
        // this request can do inside PostgreSQL whatever the plan turns out to
        // be. Resolved per request (not baked into the cached preset) so a
        // tenant lowering a timeout takes effect on the next request.
        const timeouts = protectionPgSettings(req?.requestProtection ?? DEFAULT_REQUEST_PROTECTION);

        if (req) {
          if (req.databaseId) {
            context['jwt.claims.database_id'] = req.databaseId;
          }
          // API provenance — which API surface this request arrived through.
          // Derived server-side by resolving the hostname through the scoped
          // routing plane (resolve_route -> api_id); never taken from
          // client-supplied headers, body, or token payload.
          if (req.api?.apiId) {
            context['jwt.claims.api_id'] = req.api.apiId;
          }
          if (req.clientIp) {
            context['jwt.claims.ip_address'] = req.clientIp;
          }
          if (req.get('origin')) {
            context['jwt.claims.origin'] = req.get('origin') as string;
          }
          if (req.get('User-Agent')) {
            context['jwt.claims.user_agent'] = req.get('User-Agent') as string;
          }
          if (req.deviceToken) {
            context['jwt.claims.device_token'] = req.deviceToken;
          }

          if (req.token?.user_id) {
            const pgSettings: Record<string, string> = {
              ...timeouts,
              role: snapshot.roleName,
              'jwt.claims.token_id': req.token.id,
              'jwt.claims.user_id': req.token.user_id,
              ...context
            };

            if (req.token.session_id) {
              pgSettings['jwt.claims.session_id'] = req.token.session_id;
            }
            if (req.token.root_session_id) {
              pgSettings['jwt.claims.root_session_id'] = req.token.root_session_id;
            }
            if (req.token.parent_session_id) {
              pgSettings['jwt.claims.parent_session_id'] = req.token.parent_session_id;
            }
            if (req.token.intent) {
              pgSettings['jwt.claims.intent'] = req.token.intent;
            }

            // Propagate credential metadata as JWT claims so PG functions
            // can read them via current_setting('jwt.claims.access_level') etc.
            if (req.token.access_level) {
              pgSettings['jwt.claims.access_level'] = req.token.access_level;
            }
            if (req.token.kind) {
              pgSettings['jwt.claims.kind'] = req.token.kind;
            }

            // Principal identity — always set; equals user_id for human sessions
            pgSettings['jwt.claims.principal_id'] = req.token.principal_id || req.token.user_id;

            // Enforce read-only transactions for read_only credentials
            if (req.token.access_level === 'read_only') {
              pgSettings['default_transaction_read_only'] = 'on';
            }

            if (req.requestId) {
              pgSettings['request.id'] = req.requestId;
            }

            return { pgSettings };
          }

          // Private (in-cluster) surface: there is no token — identity
          // arrives on the trusted internal X-* headers stamped by the
          // dispatching worker/sync gateway (the same vocabulary as
          // X-Database-Id above). Map it into per-request claims so writes
          // made through this surface carry actor attribution. Never applied
          // on the public surface, where client-supplied identity headers
          // must not assert identity.
          const headerActorId = req.get('X-Actor-Id');
          if (req.api?.isPublic === false && headerActorId) {
            const pgSettings: Record<string, string> = {
              ...timeouts,
              role: snapshot.roleName,
              'jwt.claims.user_id': headerActorId,
              'jwt.claims.principal_id': headerActorId,
              ...context
            };
            // The entity pair travels together: the tenant's writers reject an
            // entity id whose type they cannot interpret (`ENTITY_TYPE_REQUIRED`).
            const headerEntityId = req.get('X-Entity-Id');
            const headerEntityType = req.get('X-Entity-Type');
            if (headerEntityId) {
              pgSettings['jwt.claims.entity_id'] = headerEntityId;
            }
            if (headerEntityType) {
              pgSettings['jwt.claims.entity_type'] = headerEntityType;
            }
            const headerOrganizationId = req.get('X-Organization-Id');
            if (headerOrganizationId) {
              pgSettings['jwt.claims.organization_id'] = headerOrganizationId;
            }
            if (req.requestId) {
              pgSettings['request.id'] = req.requestId;
            }
            return { pgSettings };
          }
        }

        // No actor to name, so the tenant database the request addresses carries
        // the attribution — the same rule the sync gateway applies to a request
        // that arrives without a credential. Without it the tenant's own writers
        // refuse the work an anonymous request legitimately does
        // (`ATTRIBUTION_REQUIRED`), so a public mutation cannot enqueue a job.
        const anonSettings: Record<string, string> = {
          ...timeouts,
          role: snapshot.anonRole,
          ...context
        };
        if (req?.databaseId) {
          anonSettings['jwt.claims.entity_id'] = req.databaseId;
          anonSettings['jwt.claims.entity_type'] = 'database';
        }
        if (req?.requestId) {
          anonSettings['request.id'] = req.requestId;
        }

        return {
          pgSettings: anonSettings
        };
      }
    }
  };
};

export const graphile = (opts: ConstructiveOptions): RequestHandler => {
  const observabilityEnabled = isGraphqlObservabilityEnabled(opts.server?.host);
  const ownerIdentity = {};

  return async (req: Request, res: Response, next: NextFunction) => {
    const label = reqLabel(req);
    try {
      const api = req.api;
      if (!api) {
        log.error(`${label} Missing API info`);
        respondWithGraphQLError(res, errors.INTERNAL_FAILURE({ details: 'Missing API info' }));
        return;
      }
      const serviceKey = req.svc_key;
      if (!serviceKey) {
        log.error(`${label} Missing service cache key`);
        respondWithGraphQLError(
          res,
          errors.INTERNAL_FAILURE({ details: 'Missing service cache key' })
        );
        return;
      }
      const { dbname, anonRole, roleName, schema } = api;
      const schemas = [...(schema ?? [])];
      const schemaLabel = schemas.join(',') || 'unknown';
      const pgConfig = snapshotGraphileBuildValue(getPgEnvOptions({
        ...opts.pg,
        database: dbname
      }));

      // Route through pg-cache so the pool is tracked and can be cleaned up
      // properly, preventing leaked connections during database teardown.
      const pool = getPgPool(pgConfig);

      const databaseId = api.databaseId ?? null;
      const apiId = api.apiId;
      const databaseSettings = api.databaseSettings
        ? snapshotGraphileBuildValue(api.databaseSettings)
        : undefined;
      const introspectionRole = opts.api?.introspectionRole;
      const explain = getNodeEnv() === 'development';
      const snapshotInput = {
        ownerIdentity,
        serviceKey,
        pool,
        pgConfig,
        databaseName: dbname,
        databaseId,
        apiId,
        schemas,
        anonRole,
        roleName,
        introspectionRole,
        databaseSettings,
        graphileOptions: snapshotGraphileBuildValue(opts.graphile),
        explain,
        maskError
      };
      // Resolve the request-owned compute snapshot before cache lookup because
      // its provisioned bindings change the exact Graphile schema.
      const compute = apiId ? await req.constructive?.useModule('compute') : undefined;
      const snapshot = createGraphileServerBuildSnapshot({ ...snapshotInput, compute });
      const key = createGraphileBuildCacheKey('server', snapshot);

      const cached = graphileCache.get(key);
      if (cached) {
        log.debug(`${label} PostGraphile cache hit key=${key} db=${dbname} schemas=${schemaLabel}`);
        return cached.handler(req, res, next);
      }
      log.debug(`${label} PostGraphile cache miss key=${key} db=${dbname} schemas=${schemaLabel}`);

      const inFlight = creating.get(key);
      if (inFlight) {
        try {
          const instance = await inFlight;
          return instance.handler(req, res, next);
        } catch (error) {
          log.warn(`${label} Coalesced request failed for PostGraphile[${key}], retrying`);
        }
      }
      const recheckedCache = graphileCache.get(key);
      if (recheckedCache) return recheckedCache.handler(req, res, next);
      const retryInFlight = creating.get(key);
      if (retryInFlight) {
        const retryInstance = await retryInFlight;
        return retryInstance.handler(req, res, next);
      }

      log.info(
        `${label} Building PostGraphile v5 handler key=${key} db=${dbname} schemas=${schemaLabel} role=${roleName} anon=${anonRole}`
      );

      const creationPromise = Promise.resolve().then(async () => {
        const preset = await buildPreset(snapshot, pool);
        return observeGraphileBuild(
          { cacheKey: key, serviceKey, databaseId },
          () => createGraphileInstance({
            preset,
            cacheKey: key,
            enableRealtime: snapshot.databaseSettings?.enableRealtime
          }),
          { enabled: observabilityEnabled }
        );
      });
      creating.set(key, creationPromise);

      try {
        const instance = await creationPromise;
        Object.assign(instance, {
          serviceKey,
          databaseId,
          poolKey: snapshot.poolKey
        } satisfies Partial<GraphileCacheEntry>);
        graphileCache.set(key, instance);
        log.info(`${label} Cached PostGraphile v5 handler key=${key} db=${dbname}`);
        return instance.handler(req, res, next);
      } catch (error) {
        log.error(`${label} Failed to create PostGraphile[${key}]:`, error);
        throw new HandlerCreationError(
          `Failed to create handler for ${key}: ${error instanceof Error ? error.message : String(error)}`,
          {
            cacheKey: key,
            cause: error instanceof Error ? error.message : String(error)
          }
        );
      } finally {
        // Always clean up in-flight tracker
        creating.delete(key);
      }
    } catch (e: any) {
      log.error(`${label} PostGraphile middleware error`, e);
      if (!res.headersSent) {
        respondWithGraphQLError(
          res,
          errors.INTERNAL_FAILURE({
            details: isDev() ? e?.message ?? String(e) : 'An unexpected error occurred'
          })
        );
        return;
      }
      next(e);
    }
  };
};
