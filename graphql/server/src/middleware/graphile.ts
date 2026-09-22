import './types'; // for Request type

import { errors, normalizeError } from '@constructive-io/errors';
import type { ConstructiveOptions } from '@constructive-io/graphql-types';
import { getNodeEnv } from '@pgpmjs/env';
import { Logger } from '@pgpmjs/logger';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import {
  configureGraphileAdmission,
  createGraphileBuildCacheKey,
  createGraphileInstance,
  graphileBuildFlights,
  configureGraphileBuilds,
  snapshotGraphileBuildValue,
  type GraphileBuildFlightScope
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

/** Shared exact-key flights include both Server and Explorer builds. */
export function getInFlightCount(): number {
  return graphileBuildFlights.pendingCount;
}

export function getInFlightKeys(): string[] {
  return [...graphileBuildFlights.pendingKeys];
}

/** Fence callers and late publication; retain actual work until cleanup ends. */
export function clearInFlightMap(): void {
  graphileBuildFlights.invalidateAll();
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
  configureGraphileAdmission(opts.graphile?.cache);
  configureGraphileBuilds(opts.graphile?.build);

  return async (req: Request, res: Response, next: NextFunction) => {
    let preparationScope: GraphileBuildFlightScope | undefined;
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
      preparationScope = graphileBuildFlights.capture({
        serviceKey, databaseId, poolKey: dbname
      });
      // Resolve the request-owned compute snapshot before cache lookup because
      // its provisioned bindings change the exact Graphile schema.
      const compute = apiId ? await context.useModule('compute') : undefined;
      const snapshot = createGraphileServerBuildSnapshot({ ...snapshotInput, compute });
      const key = createGraphileBuildCacheKey('server', snapshot);

      const creationPromise = graphileBuildFlights.getOrCreate(
        { cacheKey: key, serviceKey, databaseId, poolKey: snapshot.poolKey },
        async () => {
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
        },
        preparationScope
      );

      const instance = await creationPromise;
      log.debug('Graphile handler ready', { requestId: context.requestId });
      return instance.handler(req, res, next);
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
    } finally {
      preparationScope?.release();
    }
  };
};
