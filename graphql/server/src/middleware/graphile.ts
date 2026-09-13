import './types'; // for Request type

import { errors } from '@constructive-io/errors';
import type { ComputeConfig } from '@constructive-io/express-context';
import type { ConstructiveOptions } from '@constructive-io/graphql-types';
import { getNodeEnv } from '@pgpmjs/env';
import { Logger } from '@pgpmjs/logger';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { createGraphileInstance, graphileCache,type GraphileCacheEntry } from 'graphile-cache';
import type { GraphileConfig } from 'graphile-config';
import { createFunctionBindingsPlugin } from 'graphile-function-bindings';
import { createConstructivePreset, makePgService } from 'graphile-settings';
import { getPgPool } from 'pg-cache';
import { getPgEnvOptions } from 'pg-env';

import { isGraphqlObservabilityEnabled } from '../diagnostics/observability';
import { HandlerCreationError } from '../errors/api-errors';
import { respondWithGraphQLError } from '../errors/graphql-response';
import { AuthCookiePlugin } from '../plugins/auth-cookie-plugin';
import { createErrorEventsPlugin } from '../plugins/error-events-plugin';
import { RequestProtectionPlugin } from '../plugins/request-protection-plugin';
import type { DatabaseSettings } from '../types';
import { maskError } from './mask-error';
import { getGraphileRequestPgSettings } from './graphile-request-context';
import { observeGraphileBuild } from './observability/graphile-build-stats';

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
const buildPreset = (
  pool: import('pg').Pool,
  schemas: string[],
  introspectionRole: string | undefined,
  databaseSettings?: DatabaseSettings,
  apiId?: string,
  compute?: ComputeConfig
): GraphileConfig.Preset => {
  return {
    extends: [createConstructivePreset(databaseSettings)],
    plugins: [
      AuthCookiePlugin,
      RequestProtectionPlugin,
      createErrorEventsPlugin(pool),
      // Only registered when the compute module is provisioned for this
      // database — all schema/table names come from the constructive
      // metaschema (express-context compute module loader); the plugin has
      // no fallbacks or discovery of its own.
      ...(apiId && compute?.modules.length
        ? [
          createFunctionBindingsPlugin({
            apiId,
            modules: compute.modules.map((m) => ({
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
    pgServices: [
      makePgService({
        pool,
        schemas,
        // Introspection runs outside any request, so it has no served role to
        // inherit: unset, it reads the catalog as whatever role the pool
        // connected as (a superuser in most deployments) and the schema
        // advertises that role's reach. Naming the role keeps schema shape
        // tied to a bounded role's grants.
        ...(introspectionRole && {
          pgSettingsForIntrospection: { role: introspectionRole }
        })
      })
    ],
    grafserv: {
      graphqlPath: '/graphql',
      graphiqlPath: '/graphiql',
      graphiql: true,
      graphiqlOnGraphQLGET: false,
      maskError
    },
    grafast: {
      explain: process.env.NODE_ENV === 'development',
      context: (requestContext: Partial<Grafast.RequestContext>) => {
        // In grafserv/express/v4, the request is available at requestContext.expressv4.req
        const req = (requestContext as { expressv4?: { req?: Request } })
          ?.expressv4?.req;
        return {
          pgSettings: getGraphileRequestPgSettings(req),
        };
      }
    }
  };
};

export const graphile = (opts: ConstructiveOptions): RequestHandler => {
  const observabilityEnabled = isGraphqlObservabilityEnabled(opts.server?.host);

  return async (req: Request, res: Response, next: NextFunction) => {
    const label = reqLabel(req);
    try {
      const api = req.api;
      if (!api) {
        log.error(`${label} Missing API info`);
        respondWithGraphQLError(res, errors.INTERNAL_FAILURE({ details: 'Missing API info' }));
        return;
      }
      const key = req.svc_key;
      if (!key) {
        log.error(`${label} Missing service cache key`);
        respondWithGraphQLError(
          res,
          errors.INTERNAL_FAILURE({ details: 'Missing service cache key' })
        );
        return;
      }
      const { dbname, anonRole, roleName, schema } = api;
      const schemaLabel = schema?.join(',') || 'unknown';

      // =========================================================================
      // Phase A: Cache Check (fast path)
      // =========================================================================
      const cached = graphileCache.get(key);
      if (cached) {
        log.debug(`${label} PostGraphile cache hit key=${key} db=${dbname} schemas=${schemaLabel}`);
        return cached.handler(req, res, next);
      }

      log.debug(`${label} PostGraphile cache miss key=${key} db=${dbname} schemas=${schemaLabel}`);

      // =========================================================================
      // Phase B: In-Flight Check (single-flight coalescing)
      // =========================================================================
      const inFlight = creating.get(key);
      if (inFlight) {
        log.debug(`${label} Coalescing request for PostGraphile[${key}] - waiting for in-flight creation`);
        try {
          const instance = await inFlight;
          return instance.handler(req, res, next);
        } catch (error) {
          log.warn(`${label} Coalesced request failed for PostGraphile[${key}], retrying`);
          // Fall through to Phase C to retry creation
        }
      }

      // =========================================================================
      // Phase C: Create New Handler (first request for this key)
      // =========================================================================

      // Re-check cache after coalesced request failure (another retry may have succeeded)
      const recheckedCache = graphileCache.get(key);
      if (recheckedCache) {
        log.debug(`${label} PostGraphile cache hit on re-check key=${key}`);
        return recheckedCache.handler(req, res, next);
      }

      // Re-check in-flight map (another retry may have started creation)
      const retryInFlight = creating.get(key);
      if (retryInFlight) {
        log.debug(`${label} Re-coalescing request for PostGraphile[${key}]`);
        const retryInstance = await retryInFlight;
        return retryInstance.handler(req, res, next);
      }

      log.info(
        `${label} Building PostGraphile v5 handler key=${key} db=${dbname} schemas=${schemaLabel} role=${roleName} anon=${anonRole}`
      );

      const pgConfig = getPgEnvOptions({
        ...opts.pg,
        database: dbname
      });

      // Route through pg-cache so the pool is tracked and can be cleaned up
      // properly, preventing leaked connections during database teardown.
      const pool = getPgPool(pgConfig);

      // Create promise and store in in-flight map BEFORE try block
      const compute = api.apiId ? await req.constructive?.useModule('compute') : undefined;
      const preset = buildPreset(
        pool,
        schema || [],
        opts.api?.introspectionRole,
        api.databaseSettings,
        api.apiId,
        compute
      );
      const creationPromise = observeGraphileBuild(
        {
          cacheKey: key,
          serviceKey: key,
          databaseId: api.databaseId ?? null
        },
        () => createGraphileInstance({
          preset,
          cacheKey: key,
          enableRealtime: api.databaseSettings?.enableRealtime
        }),
        { enabled: observabilityEnabled }
      );
      creating.set(key, creationPromise);

      try {
        const instance = await creationPromise;
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
