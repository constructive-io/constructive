import './types'; // for Request type

import { errors, normalizeError } from '@constructive-io/errors';
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

import { isGraphqlObservabilityEnabled } from '../diagnostics/observability';
import { respondWithGraphQLError } from '../errors/graphql-response';
import { AuthCookiePlugin } from '../plugins/auth-cookie-plugin';
import { createErrorEventsPlugin } from '../plugins/error-events-plugin';
import { RequestProtectionPlugin } from '../plugins/request-protection-plugin';
import { makeIntrospectionWiring } from './graphile-introspection';
import { maskError } from './mask-error';
import { observeGraphileBuild } from './observability/graphile-build-stats';
import { createGraphileServerBuildSnapshot } from './graphile-build-snapshot';

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
        const req = (requestContext as { expressv4?: { req?: Request } })?.expressv4?.req;
        const context = req?.constructive;
        if (!context) throw errors.INTERNAL_FAILURE({ details: 'Missing request context' });
        return { pgSettings: context.pgSettings };
      }
    }
  };
};

export const graphile = (opts: ConstructiveOptions): RequestHandler => {
  const observabilityEnabled = isGraphqlObservabilityEnabled(opts.server?.host);
  const ownerIdentity = {};

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const context = req.constructive;
      if (!context) {
        throw errors.INTERNAL_FAILURE({ details: 'Missing request context' });
      }
      const api = context.api;
      const serviceKey = context.serviceKey;
      if (!serviceKey) {
        throw errors.INTERNAL_FAILURE({ details: 'Missing service cache key' });
      }
      const { dbname, anonRole, roleName, schema } = api;
      const schemas = [...(schema ?? [])];
      const pool = context.pool;
      const databaseId = context.databaseId;
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
      const compute = apiId ? await context.useModule('compute') : undefined;
      const snapshot = createGraphileServerBuildSnapshot({ ...snapshotInput, compute });
      const key = createGraphileBuildCacheKey('server', snapshot);

      const cached = graphileCache.get(key);
      if (cached) {
        log.debug('Graphile cache hit', { requestId: context.requestId });
        return cached.handler(req, res, next);
      }
      log.debug('Graphile cache miss', { requestId: context.requestId });

      const inFlight = creating.get(key);
      if (inFlight) {
        const instance = await inFlight;
        return instance.handler(req, res, next);
      }
      const recheckedCache = graphileCache.get(key);
      if (recheckedCache) return recheckedCache.handler(req, res, next);
      const retryInFlight = creating.get(key);
      if (retryInFlight) {
        const retryInstance = await retryInFlight;
        return retryInstance.handler(req, res, next);
      }

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
        log.debug('Graphile handler ready', { requestId: context.requestId });
        return instance.handler(req, res, next);
      } finally {
        // Always clean up in-flight tracker
        creating.delete(key);
      }
    } catch (error) {
      const failure = normalizeError(error);
      log.error('Graphile request refused', {
        requestId: req.constructive?.requestId,
        code: failure.code
      });
      if (!res.headersSent) {
        respondWithGraphQLError(res, failure, { status: failure.http });
        return;
      }
      next(failure);
    }
  };
};
