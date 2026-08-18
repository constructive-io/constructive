import './types'; // for Request type

import crypto from 'node:crypto';

import { classify, type ErrorContext, errors, parse } from '@constructive-io/errors';
import type { ComputeConfig } from '@constructive-io/express-context';
import type { ConstructiveOptions } from '@constructive-io/graphql-types';
import { getNodeEnv } from '@pgpmjs/env';
import { Logger } from '@pgpmjs/logger';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { GraphQLError, GraphQLFormattedError } from 'grafast/graphql';
import { createGraphileInstance, graphileCache,type GraphileCacheEntry } from 'graphile-cache';
import type { GraphileConfig } from 'graphile-config';
import { createFunctionBindingsPlugin } from 'graphile-function-bindings';
import { createConstructivePreset } from 'graphile-settings';
import { getPgPool } from 'pg-cache';
import { getPgEnvOptions } from 'pg-env';

import { isGraphqlObservabilityEnabled } from '../diagnostics/observability';
import { HandlerCreationError } from '../errors/api-errors';
import { respondWithGraphQLError } from '../errors/graphql-response';
import { AuthCookiePlugin } from '../plugins/auth-cookie-plugin';
import type { DatabaseSettings } from '../types';
import { makeIntrospectionWiring } from './graphile-introspection';
import { observeGraphileBuild } from './observability/graphile-build-stats';

const maskErrorLog = new Logger('graphile:maskError');

const isDev = (): boolean => getNodeEnv() === 'development';

/**
 * GraphQL framework protocol codes. These originate in the GraphQL/grafast
 * transport layer (not in constructive-db), so they are not Constructive domain
 * codes in the `@constructive-io/errors` registry. They are always safe to
 * surface — they carry no sensitive detail. Everything else (auth, account,
 * resource, constraint, and every constructive-db code) is classified by the
 * registry, which is the single source of truth for public vs. internal.
 */
const GRAPHQL_PROTOCOL_CODES = new Set([
  'GRAPHQL_VALIDATION_FAILED',
  'GRAPHQL_PARSE_FAILED',
  'PERSISTED_QUERY_NOT_FOUND',
  'PERSISTED_QUERY_NOT_SUPPORTED'
]);

/** A code is safe to surface when the registry classifies it public, or it is a
 * GraphQL framework protocol code. */
const isPublicCode = (code: string | null | undefined): boolean =>
  Boolean(code) && (classify(code) === 'public' || GRAPHQL_PROTOCOL_CODES.has(code as string));

/**
 * Normalize any GraphQL/database error into a canonical Constructive shape.
 *
 * Database errors surface through Grafast without a populated `extensions.code`
 * (the semantic code lives in the message, and any SQLSTATE/DETAIL lives on the
 * underlying pg error at `originalError`). We parse `originalError` first so we
 * can recover the structured code, then fall back to the GraphQL error itself.
 */
const normalizeError = (
  error: GraphQLError,
): { code: string | null; context: ErrorContext; class: 'public' | 'internal' } => {
  const original = (error as { originalError?: unknown }).originalError;
  const fromOriginal = original ? parse(original) : null;
  const parsed = fromOriginal?.code ? fromOriginal : parse(error);
  return { code: parsed.code, context: parsed.context, class: parsed.class };
};

/**
 * Production-aware error handling backed by `@constructive-io/errors`.
 *
 * 1. Enrich `extensions.code`/`class`/`context` from the parsed error so clients
 *    always receive a machine-readable code (fixing the gap where database
 *    errors reached clients as a bare message with empty `extensions`).
 * 2. Surface public (registered/allowlisted) errors as-is.
 * 3. In development, pass everything through (enriched) for debugging.
 * 4. In production, mask internal/unknown errors behind a reference ID and log
 *    the original.
 */
const maskError = (error: GraphQLError): GraphQLError | GraphQLFormattedError => {
  const { code, context, class: errorClass } = normalizeError(error);

  // Lift the structured code onto extensions for every recognized error so
  // clients always receive a machine-readable code (`extensions` is read-only
  // on GraphQLError, so we build a formatted error rather than mutating it).
  const extensions: Record<string, unknown> = { ...error.extensions };
  if (code) {
    extensions.code = code;
    extensions.class = errorClass;
    if (Object.keys(context).length > 0) {
      extensions.context = context;
    }
  }

  const effectiveCode = code ?? (error.extensions?.code as string | undefined);
  if (isPublicCode(effectiveCode) || getNodeEnv() === 'development') {
    // Note: grafserv strips originalError and internal extensions before
    // serializing to the client, so returning the enriched error is safe.
    return {
      message: error.message,
      ...(error.locations ? { locations: error.locations } : {}),
      ...(error.path ? { path: error.path } : {}),
      extensions,
    } as GraphQLFormattedError;
  }

  // Mask internal/unknown errors with a reference ID.
  const errorId = crypto.randomBytes(8).toString('hex');
  maskErrorLog.error(`[masked-error:${errorId}]`, error);

  return {
    message: `An unexpected error occurred. Reference: ${errorId}`,
    extensions: {
      code: 'INTERNAL_SERVER_ERROR',
      errorId
    }
  } as GraphQLFormattedError;
};

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
  pool: import('pg').Pool,
  schemas: string[],
  anonRole: string,
  roleName: string,
  graphileOptions: ConstructiveOptions['graphile'],
  databaseSettings?: DatabaseSettings,
  apiId?: string,
  compute?: ComputeConfig
): Promise<GraphileConfig.Preset> => {
  const introspection = await makeIntrospectionWiring(
    pool,
    schemas,
    graphileOptions
  );
  return {
    extends: [
      createConstructivePreset(databaseSettings),
      ...introspection.presets
    ],
    plugins: [
      AuthCookiePlugin,
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
    pgServices: [introspection.pgService],
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
        const req = (requestContext as { expressv4?: { req?: Request } })?.expressv4?.req;
        const context: Record<string, string> = {};

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
              role: roleName,
              'jwt.claims.token_id': req.token.id,
              'jwt.claims.user_id': req.token.user_id,
              ...context
            };

            if (req.token.session_id) {
              pgSettings['jwt.claims.session_id'] = req.token.session_id;
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
              role: roleName,
              'jwt.claims.user_id': headerActorId,
              'jwt.claims.principal_id': headerActorId,
              ...context
            };
            const headerEntityId = req.get('X-Entity-Id');
            if (headerEntityId) {
              pgSettings['jwt.claims.entity_id'] = headerEntityId;
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

        const anonSettings: Record<string, string> = {
          role: anonRole,
          ...context
        };
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
      const preset = await buildPreset(
        pool,
        schema || [],
        anonRole,
        roleName,
        opts.graphile,
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
