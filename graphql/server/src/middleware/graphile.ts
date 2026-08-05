import './types'; // for Request type

import crypto from 'node:crypto';

import { classify, type ErrorContext, errors, parse } from '@constructive-io/errors';
import {
  buildPgSettings,
  type ComputeConfig,
  type RuntimePgPoolResolution,
  type StorageConfig
} from '@constructive-io/express-context';
import type { ConstructiveOptions } from '@constructive-io/graphql-types';
import { getNodeEnv } from '@pgpmjs/env';
import { Logger } from '@pgpmjs/logger';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import {
  type BuildRefusalReason,
  CacheBuildAdmissionError,
  createGraphileInstance,
  disposeUncachedEntry,
  evaluateBuildAdmission,
  graphileCache,
  type GraphileCacheEntry,
  GraphileRealtimeStartupError,
  invokeEntryHandler,
  invokeEntryUpgradeHandler,
  isEntryRealtimeUnavailable,
  prepareCacheForBuild,
  recordBuildRefusal,
  revalidateEntryRealtimeRole
} from 'graphile-cache';
import type { GraphileConfig } from 'graphile-config';
import { createFunctionBindingsPlugin } from 'graphile-function-bindings';
import {
  ActivatableGenerationScopedRealtimeSubscriber,
  RealtimeTopicCollector
} from 'graphile-realtime-subscriptions';
import {
  createConstructivePreset,
  createGrafastCacheLimitsPreset,
  makePgService,
  normalizeIntrospectionDependencySchemas,
  resolveConstructiveIntrospectionCapabilityExtensions
} from 'graphile-settings';
import type { GraphQLError, GraphQLFormattedError } from 'graphql';
import {
  acquirePgPool,
  getPgNotificationBrokerIdentity,
  getPgPoolIdentity,
  PgPoolCapacityError,
  type PgPoolLease
} from 'pg-cache';

import { isGraphqlObservabilityEnabled } from '../diagnostics/observability';
import { HandlerCreationError } from '../errors/api-errors';
import { respondWithGraphQLError } from '../errors/graphql-response';
import { AuthCookiePlugin } from '../plugins/auth-cookie-plugin';
import {
  createGraphileWebSocketOperationAdmission,
  type GraphileWebSocketOperationAdmission
} from '../plugins/websocket-operation-admission-plugin';
import type { DatabaseSettings } from '../types';
import {
  getGraphileWebSocketUpgradeTransport,
  GRAPHILE_WEBSOCKET_AUTH_REJECTED_CODE,
  handoffGraphileWebSocketUpgrade,
  isGraphileWebSocketOriginAllowed
} from '../websocket-upgrade';
import {
  createGraphileBuildContract,
  hashGraphileBuildContract
} from './graphile-build-contract';
import {
  captureGraphileBuildGeneration,
  GRAPHILE_BUILD_QUEUE_FULL_CODE,
  GRAPHILE_BUILD_STUCK_RESTART_REQUIRED_CODE,
  GraphileBuildCoordinatorError,
  GraphileBuildWaitAbortedError,
  isGraphileBuildGenerationCurrent,
  recordCoalescedRequest,
  runGraphileBuild,
  waitForGraphileBuild
} from './graphile-build-governor';
import {
  assertGraphileCallerPresetsSafe,
  composeGraphilePreset
} from './graphile-preset-composition';
import { getTrustedInternalClaims } from './internal-request';
import { observeGraphileBuild } from './observability/graphile-build-stats';
import {
  addRealtimeRuntimeDependencySchema,
  resolveGraphileRealtimeSchema
} from './realtime-config';
import {
  GraphileRealtimeNotificationConfigError,
  resolveRealtimeCursorIntervals,
  resolveRealtimeNotificationMode,
  resolveRealtimeNotificationPgConfig,
  resolveRealtimeNotificationRoleRevalidationMs
} from './realtime-notification-config';
import {
  createRuntimePgResolverInput,
  resolveRuntimePgConfig
} from './runtime-pg-config';
import {
  assertRuntimePgCredentials,
  shouldValidateRuntimeRoleSafety
} from './runtime-pg-requirements';
import {
  ensureRuntimeRoleSafety,
  refreshRuntimeRoleSafety
} from './runtime-role-safety';

const maskErrorLog = new Logger('graphile:maskError');

const isDev = (): boolean => getNodeEnv() === 'development';
const GRAPHILE_SURFACE_FLAGS = Object.freeze({
  graphiql: true,
  graphiqlOnGraphQLGET: false
});

let nextGraphileConfigurationIdentity = 0;

/** @internal Resolve the same routed/authenticated request for HTTP and WS. */
export const getGraphileTransportRequest = (
  requestContext: Partial<Grafast.RequestContext>
): Request | undefined => {
  const typedContext = requestContext as {
    expressv4?: { req?: Request };
    ws?: { request?: Request };
  };
  return typedContext.expressv4?.req ?? typedContext.ws?.request;
};

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
interface InFlightGraphileBuild {
  promise: Promise<GraphileCacheEntry>;
  serviceKey: string;
  databaseId: string | null;
  invalidated: boolean;
  admitted: boolean;
  waiterCount: number;
  abortController: AbortController;
}

const creating = new Map<string, InFlightGraphileBuild>();

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
  for (const build of creating.values()) {
    if (!build.admitted) build.abortController.abort();
  }
  creating.clear();
}

export const invalidateInFlightBuilds = (selector: {
  serviceKey?: string;
  databaseId?: string;
}): number => {
  let invalidated = 0;
  for (const build of creating.values()) {
    if (
      (selector.serviceKey && build.serviceKey === selector.serviceKey) ||
      (selector.databaseId && build.databaseId === selector.databaseId)
    ) {
      build.invalidated = true;
      invalidated++;
    }
  }
  return invalidated;
};

const log = new Logger('graphile');
const reqLabel = (req: Request): string => (req.requestId ? `[${req.requestId}]` : '[req]');

/**
 * A consumed IncomingMessage may be auto-destroyed while its keep-alive socket
 * remains healthy. Only the transport socket, an explicit abort, or the
 * response state tells us that the request can no longer receive a response.
 */
export const isGraphileRequestTerminal = (req: Request, res: Response): boolean =>
  Boolean(
    req.aborted
    || req.socket?.destroyed
    || res.destroyed
    || res.writableEnded
  );

const createRequestAbortHandle = (
  req: Request,
  res: Response
): { signal: AbortSignal; cleanup(): void } => {
  const controller = new AbortController();
  const abort = (): void => controller.abort();
  req.once('aborted', abort);
  res.once('close', abort);
  if (isGraphileRequestTerminal(req, res)) abort();
  return {
    signal: controller.signal,
    cleanup: () => {
      req.removeListener('aborted', abort);
      res.removeListener('close', abort);
    }
  };
};

const waitForInFlightGraphileBuild = async (
  build: InFlightGraphileBuild,
  signal: AbortSignal
): Promise<GraphileCacheEntry | null> => {
  build.waiterCount++;
  try {
    return await waitForGraphileBuild(build.promise, undefined, signal);
  } finally {
    build.waiterCount = Math.max(0, build.waiterCount - 1);
    // Active builds are allowed to finish and become useful residents. Queued
    // builds retain no pool lease and are canceled once nobody can consume them.
    if (build.waiterCount === 0 && !build.admitted) {
      build.abortController.abort();
    }
  }
};

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
  anonRole: string,
  roleName: string,
  databaseSettings?: DatabaseSettings,
  apiId?: string,
  compute?: ComputeConfig,
  storage?: StorageConfig,
  introspectionMode: 'stock' | 'scoped-required' = 'stock',
  introspectionClientReleaseMode: 'reuse' | 'destroy' = 'reuse',
  introspectionDependencySchemas: readonly string[] = [],
  grafastCache: NonNullable<ConstructiveOptions['graphile']>['grafastCache'] = {},
  releaseBuildStateAfterValidation = false,
  enableWebsockets = false,
  sharedRealtime?: {
    subscriber: ActivatableGenerationScopedRealtimeSubscriber;
    topicCollector: RealtimeTopicCollector;
  },
  websocketOperationAdmissionPlugin?: GraphileConfig.Plugin,
  callerExtends: readonly GraphileConfig.Preset[] = [],
  callerPreset?: Partial<GraphileConfig.Preset>,
  callerPresetsTrusted = false
): GraphileConfig.Preset => {
  if (enableWebsockets && !websocketOperationAdmissionPlugin) {
    throw new Error(
      'Graphile WebSockets require exact per-operation safety admission'
    );
  }
  return composeGraphilePreset({
    basePresets: [
      createConstructivePreset({
        ...databaseSettings,
        // The server always supplies an authoritative control-plane snapshot.
        // Undefined means "module not provisioned", not "query as runtime".
        preloadedStorageModules: storage?.modules ?? [],
        ...(sharedRealtime ? {
          realtimeSubscriptions: {
            onTopicsDiscovered: sharedRealtime.topicCollector.collect
          }
        } : {})
      })
    ],
    callerExtends,
    callerPreset,
    callerPresetsTrusted,
    protectedPresets: [
      createGrafastCacheLimitsPreset(grafastCache)
    ],
    protectedPlugins: [
      AuthCookiePlugin,
      ...(websocketOperationAdmissionPlugin
        ? [websocketOperationAdmissionPlugin]
        : []),
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
            })),
            preloadedBindings: compute.bindings.map((binding) => ({
              ...binding,
              module: {
                computeSchema: binding.module.schemaName,
                bindingsTable: binding.module.bindingsTableName,
                definitionsTable: binding.module.definitionsTableName,
                invocationsSchema: binding.module.invocationsSchemaName,
                invocationsTable: binding.module.invocationsTableName,
                invocationsEntityField: binding.module.invocationsEntityField
              }
            }))
          })
        ]
        : [])
    ],
    pgServices: [
      makePgService({
        pool,
        schemas,
        introspectionMode,
        introspectionClientReleaseMode,
        introspectionAllowedDependencySchemas: introspectionDependencySchemas,
        ...(introspectionMode === 'scoped-required' ? {
          introspectionCapabilityExtensions:
            resolveConstructiveIntrospectionCapabilityExtensions(databaseSettings)
        } : {}),
        ...(sharedRealtime ? {
          pubsub: false,
          pgSubscriber: sharedRealtime.subscriber
        } : {})
      })
    ],
    schema: {
      releaseBuildStateAfterValidation
    },
    grafserv: {
      graphqlPath: '/graphql',
      graphiqlPath: '/graphiql',
      ...GRAPHILE_SURFACE_FLAGS,
      websockets: enableWebsockets,
      maskError
    },
    grafast: {
      explain: isDev(),
      context: (requestContext: Partial<Grafast.RequestContext>) => {
        // HTTP carries the Express request directly. WebSocket execution keeps
        // the same already-routed/authenticated IncomingMessage under `ws`, so
        // both transports derive identical roles, claims, and security GUCs.
        const req = getGraphileTransportRequest(requestContext);
        const api = req?.api ?? {
          dbname: '',
          schema: schemas,
          anonRole,
          roleName
        };
        const trustedClaims = getTrustedInternalClaims(req);

        return {
          pgSettings: buildPgSettings({
            api,
            token: req?.token ?? null,
            requestId: req?.requestId ?? '',
            clientIp: req?.clientIp,
            origin: req?.get('origin'),
            userAgent: req?.get('User-Agent'),
            deviceToken: req?.deviceToken,
            trustedClaims,
            dependencySchemas: introspectionDependencySchemas
          })
        };
      }
    }
  });
};

export class GraphileBuildInvalidatedError extends Error {
  readonly code = 'GRAPHILE_BUILD_INVALIDATED';

  constructor() {
    super('Graphile build was invalidated before it could become resident');
    this.name = 'GraphileBuildInvalidatedError';
  }
}

export class GraphileBuildPublicationError extends Error {
  readonly code = 'GRAPHILE_BUILD_PUBLICATION_FAILED';

  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'GraphileBuildPublicationError';
  }
}

/** @internal Explicit ownership state for the build-to-entry pool lease handoff. */
export class GraphileBuildPoolLeaseOwner {
  private pending: PgPoolLease | undefined;

  constructor(lease: PgPoolLease | undefined) {
    this.pending = lease;
  }

  get lease(): PgPoolLease | undefined {
    return this.pending;
  }

  transferTo(entry: GraphileCacheEntry): void {
    const expected = this.pending;
    if (!expected) {
      throw new GraphileBuildPublicationError(
        `PostGraphile[${entry.cacheKey}] has no pending pool lease to transfer`
      );
    }
    if (entry.poolLease !== expected) {
      throw new GraphileBuildPublicationError(
        `PostGraphile[${entry.cacheKey}] did not retain the build pool lease`
      );
    }

    // The entry now owns the lease even when a later identity assertion fails;
    // its disposal path, rather than the build finally block, must release it.
    this.pending = undefined;
    if (entry.poolIdentity !== expected.identity) {
      throw new GraphileBuildPublicationError(
        `PostGraphile[${entry.cacheKey}] retained an unexpected pool identity`
      );
    }
  }

  release(): void {
    const pending = this.pending;
    this.pending = undefined;
    pending?.release();
  }
}

interface GraphileBuildPublicationCache {
  get(key: string): GraphileCacheEntry | undefined;
  set(key: string, entry: GraphileCacheEntry): unknown;
  delete(key: string): boolean;
}

interface GraphileBuildPublicationDependencies {
  cache?: GraphileBuildPublicationCache;
  dispose?: (entry: GraphileCacheEntry, key: string) => Promise<void>;
}

/** @internal Publish exactly one authoritative entry or dispose the candidate. */
export const publishGraphileBuild = async (
  key: string,
  candidate: GraphileCacheEntry,
  invalidated: boolean,
  dependencies: GraphileBuildPublicationDependencies = {}
): Promise<GraphileCacheEntry> => {
  const cache = dependencies.cache ?? graphileCache;
  const dispose = dependencies.dispose ?? disposeUncachedEntry;
  const cleanupCandidate = async (message: string): Promise<void> => {
    try {
      await dispose(candidate, key);
    } catch (cleanupError) {
      throw new GraphileBuildPublicationError(
        `${message}; candidate disposal also failed`,
        cleanupError
      );
    }
  };
  const disposeCandidate = async (message: string, cause?: unknown): Promise<never> => {
    await cleanupCandidate(message);
    throw new GraphileBuildPublicationError(message, cause);
  };
  const candidateUnavailable = (): boolean =>
    candidate.disposing === true || isEntryRealtimeUnavailable(candidate);
  const rejectPublishedCandidate = async (message: string): Promise<never> => {
    if (cache.get(key) === candidate) cache.delete(key);
    return disposeCandidate(message);
  };

  if (invalidated) {
    await cleanupCandidate(`PostGraphile[${key}] invalidation disposal failed`);
    throw new GraphileBuildInvalidatedError();
  }
  if (candidateUnavailable()) {
    return disposeCandidate(
      `PostGraphile[${key}] became unavailable before publication`
    );
  }

  const resident = cache.get(key);
  if (resident && resident !== candidate) {
    if (resident.disposing) {
      return disposeCandidate(
        `PostGraphile[${key}] collided with a disposing resident entry`
      );
    }
    await cleanupCandidate(`PostGraphile[${key}] duplicate disposal failed`);
    const authoritative = cache.get(key);
    if (authoritative !== resident || resident.disposing) {
      throw new GraphileBuildPublicationError(
        `PostGraphile[${key}] resident changed while discarding a duplicate build`
      );
    }
    log.warn(`Discarded duplicate PostGraphile[${key}] build; using the resident entry`);
    return resident;
  }
  if (resident === candidate) {
    if (candidateUnavailable()) {
      return rejectPublishedCandidate(
        `PostGraphile[${key}] resident candidate became unavailable`
      );
    }
    return candidate;
  }

  try {
    cache.set(key, candidate);
  } catch (error) {
    return disposeCandidate(`Failed to publish PostGraphile[${key}]`, error);
  }

  const published = cache.get(key);
  if (published === candidate) {
    if (candidateUnavailable()) {
      return rejectPublishedCandidate(
        `PostGraphile[${key}] became unavailable during publication`
      );
    }
    return candidate;
  }
  if (published && !published.disposing) {
    await cleanupCandidate(`PostGraphile[${key}] replaced-candidate disposal failed`);
    const authoritative = cache.get(key);
    if (authoritative !== published || published.disposing) {
      throw new GraphileBuildPublicationError(
        `PostGraphile[${key}] resident changed after publication replacement`
      );
    }
    log.warn(`PostGraphile[${key}] publication was replaced; using the resident entry`);
    return published;
  }
  return disposeCandidate(`PostGraphile[${key}] was not resident after publication`);
};

export const GRAPHILE_BUILD_RESIDENT_CAPACITY_CODE =
  'GRAPHILE_BUILD_RESIDENT_CAPACITY';

export const BUILD_REFUSAL_CODES = {
  critical_pressure: 'GRAPHILE_BUILD_MEMORY_PRESSURE',
  insufficient_budget: 'GRAPHILE_BUILD_BUDGET_EXCEEDED',
  rss_budget_exceeded: 'GRAPHILE_BUILD_RSS_BUDGET_EXCEEDED',
  disposal_timeout: 'GRAPHILE_BUILD_DISPOSAL_TIMEOUT',
  resident_busy: 'GRAPHILE_BUILD_CAPACITY_BUSY',
  resident_capacity: GRAPHILE_BUILD_RESIDENT_CAPACITY_CODE,
  disposal_failed: 'GRAPHILE_BUILD_DISPOSAL_FAILED'
} as const satisfies Record<BuildRefusalReason, string>;

const respondBuildUnavailable = (
  res: Response,
  code: string,
  message: string,
  retryAfterSeconds = 15
): void => {
  if (res.destroyed || res.writableEnded) return;
  res.setHeader('Retry-After', String(retryAfterSeconds));
  res.status(503).json({ error: { code, message } });
};

export const handleBuildAvailabilityError = (
  res: Response,
  error: unknown
): boolean => {
  if (error instanceof PgPoolCapacityError) {
    respondBuildUnavailable(
      res,
      error.code,
      'PostgreSQL connection capacity is temporarily unavailable',
      error.retryAfterSeconds
    );
    return true;
  }
  if (error instanceof CacheBuildAdmissionError) {
    respondBuildUnavailable(
      res,
      BUILD_REFUSAL_CODES[error.reason],
      'GraphQL schema capacity is temporarily unavailable',
      error.retryAfterSeconds
    );
    return true;
  }
  if (error instanceof GraphileBuildCoordinatorError) {
    respondBuildUnavailable(
      res,
      error.code,
      error.code === GRAPHILE_BUILD_QUEUE_FULL_CODE
        ? 'GraphQL schema build queue is full; retry shortly'
        : error.code === GRAPHILE_BUILD_STUCK_RESTART_REQUIRED_CODE
          ? 'GraphQL schema build admission is unhealthy; process restart is required'
          : 'GraphQL schema build admission is closed for shutdown',
      error.retryAfterSeconds
    );
    return true;
  }
  if (error instanceof GraphileBuildInvalidatedError) {
    respondBuildUnavailable(
      res,
      error.code,
      'GraphQL schema changed while it was building; retry shortly',
      1
    );
    return true;
  }
  if (error instanceof GraphileBuildPublicationError) {
    respondBuildUnavailable(
      res,
      error.code,
      'GraphQL schema publication failed; retry shortly',
      1
    );
    return true;
  }
  if (error instanceof GraphileRealtimeNotificationConfigError) {
    respondBuildUnavailable(
      res,
      error.code,
      'Shared realtime notification configuration is unavailable'
    );
    return true;
  }
  if (error instanceof GraphileRealtimeStartupError) {
    respondBuildUnavailable(
      res,
      error.code,
      'Realtime delivery could not be activated for this GraphQL instance'
    );
    return true;
  }
  return false;
};

const handleBuildWaitAbort = (
  res: Response,
  error: unknown,
  requestSignal: AbortSignal
): boolean => {
  if (!(error instanceof GraphileBuildWaitAbortedError)) return false;
  if (!requestSignal.aborted) {
    respondBuildUnavailable(
      res,
      'GRAPHILE_BUILD_CANCELED',
      'GraphQL schema build was canceled before admission; retry shortly',
      1
    );
  }
  return true;
};

export const graphile = (
  opts: ConstructiveOptions,
  getRuntimePgResolution?: (
    req: Request
  ) => Readonly<RuntimePgPoolResolution>
): RequestHandler => {
  // The resident cache is process-wide, but caller presets may contain hooks
  // whose captured state cannot be serialized. Never share a generation
  // across two independently constructed server configurations, even when all
  // visible data fields happen to compare equal.
  const configurationIdentity =
    `graphile-configuration:v1:${++nextGraphileConfigurationIdentity}`;
  const callerPresetsTrusted =
    getNodeEnv() !== 'production'
    || opts.graphile?.trustCallerPresetsInProduction === true;
  assertRuntimePgCredentials(opts, getNodeEnv());
  assertGraphileCallerPresetsSafe({
    callerExtends: opts.graphile?.extends,
    callerPreset: opts.graphile?.preset,
    callerPresetsTrusted
  });
  const introspectionDependencySchemas = normalizeIntrospectionDependencySchemas(
    opts.graphile?.introspectionDependencySchemas
  );
  const observabilityEnabled = isGraphqlObservabilityEnabled(opts.server?.host);
  const runtimeSafetyRequired = shouldValidateRuntimeRoleSafety(opts, getNodeEnv());
  const realtimeNotificationMode = resolveRealtimeNotificationMode(opts);
  const realtimeNotificationRoleRevalidationMs =
    resolveRealtimeNotificationRoleRevalidationMs(opts);
  const realtimeCursorIntervals = resolveRealtimeCursorIntervals(opts);

  return async (req: Request, res: Response, next: NextFunction) => {
    const label = reqLabel(req);
    const requestAbort = createRequestAbortHandle(req, res);
    const websocketUpgrade = getGraphileWebSocketUpgradeTransport(req);
    const invokeEntry = (entry: GraphileCacheEntry): boolean => {
      if (!websocketUpgrade) return invokeEntryHandler(entry, req, res, next);
      return invokeEntryUpgradeHandler(
        entry,
        req,
        websocketUpgrade.socket,
        websocketUpgrade.head,
        {
          onAccepted: () => {
            handoffGraphileWebSocketUpgrade(req, res);
          },
          onRejected: () => {
            handoffGraphileWebSocketUpgrade(req, res);
          }
        }
      );
    };
    try {
      const api = req.api;
      if (!api) {
        log.error(`${label} Missing API info`);
        respondWithGraphQLError(res, errors.INTERNAL_FAILURE({ details: 'Missing API info' }));
        return;
      }
      if (
        websocketUpgrade
        && !isGraphileWebSocketOriginAllowed(req, opts.server?.origin)
      ) {
        res.status(403).json({
          error: {
            code: GRAPHILE_WEBSOCKET_AUTH_REJECTED_CODE,
            message: 'WebSocket origin is not allowed'
          }
        });
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
      const schemaLabel = schema?.join(',') || 'unknown';
      const poolOptions = { purpose: 'runtime', sanitizeOnCheckout: true } as const;
      const runtimePgResolution = getRuntimePgResolution
        ? getRuntimePgResolution(req)
        : await resolveRuntimePgConfig(
          opts,
          createRuntimePgResolverInput(api)
        );
      const pgConfig = runtimePgResolution.pgConfig;
      const poolIdentity = runtimePgResolution.poolIdentity;
      if (getPgPoolIdentity(pgConfig, poolOptions) !== poolIdentity) {
        throw new Error(
          'Resolved runtime PostgreSQL pool identity changed before Graphile acquisition'
        );
      }
      if (
        req.constructive
        && req.constructive.runtimePoolIdentity !== poolIdentity
      ) {
        throw new Error(
          'Request context and Graphile resolved different runtime PostgreSQL pools'
        );
      }
      const [compute, storage] = await Promise.all([
        api.apiId ? req.constructive?.useModule('compute') : undefined,
        (api.databaseSettings?.enablePresignedUploads ?? true)
          ? req.constructive?.useModule('storage')
          : undefined
      ]);
      const introspectionMode = opts.graphile?.introspectionMode ?? 'stock';
      const introspectionClientReleaseMode =
        opts.graphile?.introspectionClientReleaseMode ?? 'reuse';
      const realtimeEnabled = api.databaseSettings?.enableRealtime ?? false;
      const realtimeSchema = resolveGraphileRealtimeSchema(opts, realtimeEnabled);
      const notificationPgConfig = realtimeEnabled
        && realtimeNotificationMode === 'shared-exact'
        ? await resolveRealtimeNotificationPgConfig(opts, {
          databaseId: api.databaseId ?? '',
          databaseName: dbname,
          apiId: api.apiId ?? '',
          schemas: schema ?? []
        })
        : null;
      const realtimeListenerPoolIdentity = notificationPgConfig
        ? getPgNotificationBrokerIdentity(notificationPgConfig)
        : null;
      const runtimeDependencySchemas = addRealtimeRuntimeDependencySchema(
        introspectionDependencySchemas,
        realtimeSchema
      );
      const buildContract = createGraphileBuildContract({
        configurationIdentity,
        poolIdentity,
        databaseId: api.databaseId ?? '',
        databaseName: dbname,
        apiId: api.apiId ?? '',
        schemas: schema ?? [],
        authenticatedRole: roleName,
        anonymousRole: anonRole,
        pluginSettings: api.databaseSettings,
        graphileSettings: opts.graphile,
        compute,
        storage,
        isPublic: api.isPublic,
        enableRealtime: realtimeEnabled,
        realtimeSchema: realtimeSchema ?? undefined,
        realtimeNotificationMode,
        realtimeListenerPoolIdentity: realtimeListenerPoolIdentity ?? undefined,
        realtimeNotificationRoleRevalidationMs,
        realtimeCursorPollIntervalMs: realtimeCursorIntervals.pollIntervalMs,
        realtimeCursorHeartbeatIntervalMs: realtimeCursorIntervals.heartbeatIntervalMs,
        ...GRAPHILE_SURFACE_FLAGS,
        explain: isDev(),
        introspectionMode,
        introspectionClientReleaseMode
      });
      const key = hashGraphileBuildContract(buildContract);
      const ensureRuntimeSafety = async (): Promise<void> => {
        // Hold an operation-scoped lease even when a resident entry already
        // owns this pool. The entry may be evicted while the async audit runs;
        // this lease prevents pool teardown until the audit has settled.
        const auditLease = acquirePgPool(pgConfig, poolOptions);
        try {
          await ensureRuntimeRoleSafety(
            auditLease.pool,
            [anonRole, roleName],
            schema ?? [],
            runtimeDependencySchemas
          );
        } finally {
          auditLease.release();
        }
      };

      const cached = graphileCache.get(key);
      if (cached) {
        // A role or schema can drift after the instance was built. Re-enter
        // the fail-closed audit on every resident path; the audit itself
        // coalesces requests and reuses only recent successful results.
        if (runtimeSafetyRequired) await ensureRuntimeSafety();
        await revalidateEntryRealtimeRole(cached);
        if (invokeEntry(cached)) {
          log.debug(`${label} PostGraphile cache hit key=${key} route=${serviceKey} db=${dbname} schemas=${schemaLabel}`);
          return;
        }
        if (isGraphileRequestTerminal(req, res)) return;
      }

      log.debug(`${label} PostGraphile cache miss key=${key} route=${serviceKey} db=${dbname} schemas=${schemaLabel}`);
      if (isGraphileRequestTerminal(req, res)) return;

      const inFlight = creating.get(key);
      if (inFlight) {
        recordCoalescedRequest();
        log.debug(`${label} Coalescing request for PostGraphile[${key}] - waiting for in-flight creation`);
        try {
          const instance = await waitForInFlightGraphileBuild(inFlight, requestAbort.signal);
          if (!instance) {
            respondBuildUnavailable(
              res,
              'GRAPHILE_BUILD_WAIT_TIMEOUT',
              'GraphQL schema build is still in progress'
            );
            return;
          }
          if (runtimeSafetyRequired) await ensureRuntimeSafety();
          await revalidateEntryRealtimeRole(instance);
          if (invokeEntry(instance)) return;
          respondBuildUnavailable(
            res,
            'GRAPHILE_INSTANCE_ROTATING',
            'GraphQL schema instance is rotating',
            1
          );
          return;
        } catch (error) {
          if (handleBuildWaitAbort(res, error, requestAbort.signal)) return;
          if (handleBuildAvailabilityError(res, error)) return;
          throw error;
        }
      }

      const earlyDecision = evaluateBuildAdmission();
      if (!earlyDecision.admit && earlyDecision.reason === 'critical_pressure') {
        recordBuildRefusal(earlyDecision.reason);
        respondBuildUnavailable(
          res,
          'GRAPHILE_BUILD_MEMORY_PRESSURE',
          'Server memory pressure is too high to start a new GraphQL schema build'
        );
        return;
      }
      if (!earlyDecision.admit && earlyDecision.reason === 'resident_capacity') {
        recordBuildRefusal(earlyDecision.reason);
        handleBuildAvailabilityError(res, new CacheBuildAdmissionError(
          earlyDecision.reason
        ));
        return;
      }

      log.info(
        `${label} Building PostGraphile v5 handler key=${key} route=${serviceKey} db=${dbname} schemas=${schemaLabel} role=${roleName} anon=${anonRole}`
      );

      const buildGeneration = captureGraphileBuildGeneration();
      const buildState: InFlightGraphileBuild = {
        promise: null as unknown as Promise<GraphileCacheEntry>,
        serviceKey,
        databaseId: api.databaseId ?? null,
        invalidated: false,
        admitted: false,
        waiterCount: 0,
        abortController: new AbortController()
      };
      const creationPromise = runGraphileBuild(async () => {
        let poolLeaseOwner: GraphileBuildPoolLeaseOwner | undefined;
        let sharedRealtimeBuild: {
          subscriber: ActivatableGenerationScopedRealtimeSubscriber;
          topicCollector: RealtimeTopicCollector;
        } | undefined;
        let sharedRealtimeOwnershipTransferred = false;
        let websocketOperationAdmission:
          GraphileWebSocketOperationAdmission | undefined;
        try {
          const builtWhileQueued = graphileCache.get(key);
          if (builtWhileQueued && !builtWhileQueued.disposing) return builtWhileQueued;

          await prepareCacheForBuild();
          if (
            buildState.invalidated
            || !isGraphileBuildGenerationCurrent(buildGeneration)
          ) {
            throw new GraphileBuildInvalidatedError();
          }

          // A queued build retains only immutable contract inputs. The large
          // preset and runtime-pool lease are acquired after the serialized
          // heap slot is granted and are owned until publication or failure.
          const buildPoolLease = acquirePgPool(pgConfig, poolOptions);
          poolLeaseOwner = new GraphileBuildPoolLeaseOwner(buildPoolLease);
          const pool = buildPoolLease.pool;
          if (notificationPgConfig) {
            sharedRealtimeBuild = {
              subscriber: new ActivatableGenerationScopedRealtimeSubscriber(),
              topicCollector: new RealtimeTopicCollector()
            };
          }
          if (realtimeEnabled) {
            websocketOperationAdmission = createGraphileWebSocketOperationAdmission({
              cacheKey: key,
              databaseId: api.databaseId ?? '',
              databaseName: dbname,
              apiId: api.apiId ?? '',
              schemas: schema ?? [],
              authenticatedRole: roleName,
              anonymousRole: anonRole,
              dependencySchemas: runtimeDependencySchemas,
              runtimeSafetyRequired
            });
          }
          const preset = buildPreset(
            pool,
            schema || [],
            anonRole,
            roleName,
            api.databaseSettings,
            api.apiId,
            compute,
            storage,
            introspectionMode,
            introspectionClientReleaseMode,
            introspectionDependencySchemas,
            opts.graphile?.grafastCache,
            opts.graphile?.releaseBuildStateAfterValidation ?? false,
            realtimeEnabled,
            sharedRealtimeBuild,
            websocketOperationAdmission?.plugin,
            opts.graphile?.extends,
            opts.graphile?.preset,
            callerPresetsTrusted
          );

          const instance = await observeGraphileBuild(
            {
              cacheKey: key,
              serviceKey,
              databaseId: api.databaseId ?? null
            },
            async () => {
              if (runtimeSafetyRequired) {
                await refreshRuntimeRoleSafety(
                  pool,
                  [anonRole, roleName],
                  schema ?? [],
                  runtimeDependencySchemas
                );
              }
              const built = await createGraphileInstance({
                preset,
                cacheKey: key,
                poolIdentity,
                poolLease: poolLeaseOwner!.lease,
                serviceKey,
                databaseId: api.databaseId ?? null,
                enableRealtime: realtimeEnabled,
                enableWebsockets: realtimeEnabled,
                realtimeSchema: realtimeSchema ?? undefined,
                realtimeSourceSchemas: schema ?? [],
                realtimeCursorPollIntervalMs: realtimeCursorIntervals.pollIntervalMs,
                realtimeCursorHeartbeatIntervalMs:
                  realtimeCursorIntervals.heartbeatIntervalMs,
                ...(notificationPgConfig && sharedRealtimeBuild
                  && realtimeListenerPoolIdentity ? {
                    sharedRealtime: {
                      ...sharedRealtimeBuild,
                      listenerPgConfig: notificationPgConfig,
                      listenerIdentity: realtimeListenerPoolIdentity,
                      roleRevalidationMs:
                        realtimeNotificationRoleRevalidationMs
                    }
                  } : {})
              });
              sharedRealtimeOwnershipTransferred = Boolean(sharedRealtimeBuild);
              try {
                websocketOperationAdmission?.bind(built);
                poolLeaseOwner!.transferTo(built);
              } catch (transferError) {
                try {
                  await disposeUncachedEntry(built, key);
                } catch (cleanupError) {
                  throw new GraphileBuildPublicationError(
                    `PostGraphile[${key}] lease-transfer cleanup failed`,
                    cleanupError
                  );
                }
                throw transferError;
              }
              return built;
            },
            { enabled: observabilityEnabled }
          );
          return publishGraphileBuild(
            key,
            instance,
            buildState.invalidated || !isGraphileBuildGenerationCurrent(buildGeneration)
          );
        } finally {
          // Covers queued-cache hits, admission/safety failures, and rejected
          // instance creation. Entry-owned leases were cleared above.
          poolLeaseOwner?.release();
          if (sharedRealtimeBuild && !sharedRealtimeOwnershipTransferred) {
            await sharedRealtimeBuild.subscriber.release();
          }
        }
      }, {
        signal: buildState.abortController.signal,
        onAdmitted: () => {
          buildState.admitted = true;
        }
      });
      buildState.promise = creationPromise;
      creating.set(key, buildState);

      void creationPromise
        .then(() => log.info(`${label} PostGraphile v5 handler ready key=${key} db=${dbname}`))
        .catch(() => {
          // The request path records the concrete failure. Detached builds may
          // finish after a waiter timed out; their rejection is intentionally consumed.
        })
        .finally(() => {
          if (creating.get(key) === buildState) creating.delete(key);
        });

      try {
        const instance = await waitForInFlightGraphileBuild(buildState, requestAbort.signal);
        if (!instance) {
          respondBuildUnavailable(
            res,
            'GRAPHILE_BUILD_WAIT_TIMEOUT',
            'GraphQL schema build is still in progress'
          );
          return;
        }
        if (runtimeSafetyRequired) await ensureRuntimeSafety();
        await revalidateEntryRealtimeRole(instance);
        if (invokeEntry(instance)) return;
        respondBuildUnavailable(
          res,
          'GRAPHILE_INSTANCE_ROTATING',
          'GraphQL schema instance is rotating',
          1
        );
        return;
      } catch (error) {
        if (handleBuildWaitAbort(res, error, requestAbort.signal)) return;
        if (handleBuildAvailabilityError(res, error)) return;
        log.error(`${label} Failed to create PostGraphile[${key}]:`, error);
        throw new HandlerCreationError(
          `Failed to create handler for ${key}: ${error instanceof Error ? error.message : String(error)}`,
          {
            cacheKey: key,
            cause: error instanceof Error ? error.message : String(error)
          }
        );
      }
    } catch (e: any) {
      if (isGraphileRequestTerminal(req, res)) return;
      if (handleBuildWaitAbort(res, e, requestAbort.signal)) return;
      if (!res.headersSent && handleBuildAvailabilityError(res, e)) return;
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
    } finally {
      requestAbort.cleanup();
    }
  };
};
