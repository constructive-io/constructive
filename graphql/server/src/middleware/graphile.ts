import crypto from 'node:crypto';
import { getNodeEnv } from '@pgpmjs/env';
import type { ConstructiveOptions } from '@constructive-io/graphql-types';
import { Logger } from '@pgpmjs/logger';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
// Type-only import of the canonical GraphQL error types. Imported from 'graphql'
// (a direct, version-pinned dependency) rather than the 'grafast/graphql' subpath so
// the types resolve under every moduleResolution mode — including ts-jest, which type-
// checks this file transitively via the diagnostics metrics sampler. Erased at runtime.
import type { GraphQLError, GraphQLFormattedError } from 'graphql';
import type { Pool } from 'pg';
import {
  createGraphileInstance,
  ensureCacheHeadroom,
  type GraphileCacheEntry,
  graphileCache,
  invokeEntryHandler,
  shouldRefuseBuild,
} from 'graphile-cache';
import type { GraphileConfig } from 'graphile-config';
import { createConstructivePreset, makePgService } from 'graphile-settings';
import { getPgPool } from 'pg-cache';
import { getPgEnvOptions } from 'pg-env';
import './types'; // for Request type
import { isBlueprintPoolingEnabled, tenantSearchPath } from './blueprint';
import { resolvePoolDecision } from './pooling-decision';
import { isGraphqlObservabilityEnabled } from '../diagnostics/observability';
import { HandlerCreationError } from '../errors/api-errors';
import { observeGraphileBuild } from './observability/graphile-build-stats';
import type { DatabaseSettings } from '../types';
import { AuthCookiePlugin } from '../plugins/auth-cookie-plugin';

// Re-exported so flush.ts (and other callers) can invalidate pooling decisions
// through the graphile module surface.
export { clearPoolDecisions } from './pooling-decision';

const maskErrorLog = new Logger('graphile:maskError');

const SAFE_ERROR_CODES = new Set([
  // GraphQL standard
  'GRAPHQL_VALIDATION_FAILED',
  'GRAPHQL_PARSE_FAILED',
  'PERSISTED_QUERY_NOT_FOUND',
  'PERSISTED_QUERY_NOT_SUPPORTED',
  // Auth
  'UNAUTHENTICATED',
  'NOT_AUTHENTICATED',
  'USER_NOT_AUTHENTICATED',
  'FORBIDDEN',
  'BAD_USER_INPUT',
  'INCORRECT_PASSWORD',
  'PASSWORD_INSECURE',
  'ACCOUNT_LOCKED',
  'ACCOUNT_LOCKED_EXCEED_ATTEMPTS',
  'ACCOUNT_DISABLED',
  'ACCOUNT_EXISTS',
  'ACCOUNT_NOT_FOUND',
  'USER_NOT_FOUND',
  'INVALID_USER',
  'INVALID_TOKEN',
  'INVALID_CODE',
  'NO_PRIMARY_EMAIL',
  'NO_CREDENTIALS',
  'PASSWORD_LEN',
  'INVITE_NOT_FOUND',
  'INVITE_LIMIT',
  'INVITE_EMAIL_NOT_FOUND',
  'EMAIL_NOT_VERIFIED',
  'PROFILE_ASSIGNMENT_REQUIRES_EMAIL_INVITE',
  'ASSIGN_PROFILES_PERMISSION_REQUIRED',
  'PROFILE_NOT_FOUND',
  'PROFILE_EXCEEDS_PERMISSIONS',
  'MEMBERSHIP_NOT_FOUND',
  'INVALID_CREDENTIALS',
  // Auth method toggles (app-level allow_* settings)
  'SIGN_UP_DISABLED',
  'PASSWORD_SIGN_IN_DISABLED',
  'PASSWORD_SIGN_UP_DISABLED',
  'SSO_SIGN_IN_DISABLED',
  'SSO_SIGN_UP_DISABLED',
  'SSO_ACCOUNT_NOT_FOUND',
  'CONNECTED_ACCOUNT_NOT_FOUND',
  'MAGIC_LINK_SIGN_IN_DISABLED',
  'MAGIC_LINK_SIGN_UP_DISABLED',
  'EMAIL_OTP_SIGN_IN_DISABLED',
  'SMS_SIGN_IN_DISABLED',
  'SMS_SIGN_UP_DISABLED',
  // CSRF
  'CSRF_TOKEN_REQUIRED',
  'INVALID_CSRF_TOKEN',
  // Rate limiting / throttling
  'TOO_MANY_REQUESTS',
  'PASSWORD_RESET_LOCKED_EXCEED_ATTEMPTS',
  // TOTP / MFA / step-up
  'TOTP_NOT_ENABLED',
  'TOTP_ALREADY_ENABLED',
  'TOTP_SETUP_NOT_INITIATED',
  'MFA_REQUIRED',
  'MFA_CHALLENGE_EXPIRED',
  'INVALID_MFA_CHALLENGE',
  'STEP_UP_REQUIRED',
  'STEP_UP_REQUIRED_PASSWORD',
  'STEP_UP_REQUIRED_PASSWORD_OR_MFA',
  // Sessions / API keys
  'SESSION_NOT_FOUND',
  'API_KEY_NOT_FOUND',
  'CANNOT_DISCONNECT_LAST_AUTH_METHOD',
  'CANNOT_REVOKE_CURRENT_SESSION',
  // Account / resource operations
  'NOT_FOUND',
  'NULL_VALUES_DISALLOWED',
  'OBJECT_NOT_FOUND',
  'OBJECT_NO_UPDATE',
  'LIMIT_REACHED',
  'REQUIRES_ONE_OWNER',
  'DELETE_FIRST',
  'REF_NOT_FOUND',
  'CROSS_DATABASE_REF',
  'GROUPS_REQ_ENTITIES',
  'ALREADY_SCHEDULED',
  'SINGLETON_TABLE',
  // Entity/field immutability
  'IMMUTABLE_FIELD',
  'IMMUTABLE_PROPS',
  'IMMUTABLE_PEOPLESTAMPS',
  'IMMUTABLE_TIMESTAMPS',
  'CONST_TYPE_FIELDS_IMMUTABLE',
  // PublicKeySignature
  'FEATURE_DISABLED',
  'INVALID_PUBLIC_KEY',
  'INVALID_MESSAGE',
  'INVALID_SIGNATURE',
  'NO_ACCOUNT_EXISTS',
  'BAD_SIGNIN',
  // Upload
  'UPLOAD_MIMETYPE',
  // PostgreSQL constraint violations (surfaced by PostGraphile)
  '23505', // unique_violation
  '23503', // foreign_key_violation
  '23502', // not_null_violation
  '23514', // check_violation
  '23P01', // exclusion_violation
]);

/**
 * Production-aware error masking function.
 *
 * In development: returns errors as-is for debugging.
 * In production: returns errors with explicit codes from the SAFE_ERROR_CODES
 * allowlist as-is, but masks unexpected/database errors with a reference ID
 * and logs the original.
 */
const maskError = (error: GraphQLError): GraphQLError | GraphQLFormattedError => {
  if (getNodeEnv() === 'development') {
    return error;
  }

  // Only expose errors with codes on the safe allowlist.
  // Note: grafserv strips originalError and internal extensions before
  // serializing to the client, so returning the full error object is safe here.
  if (error.extensions?.code && SAFE_ERROR_CODES.has(error.extensions.code as string)) {
    return error;
  }

  // Mask unexpected/database errors with a reference ID
  const errorId = crypto.randomBytes(8).toString('hex');
  maskErrorLog.error(`[masked-error:${errorId}]`, error);

  return {
    message: `An unexpected error occurred. Reference: ${errorId}`,
    extensions: {
      code: 'INTERNAL_SERVER_ERROR',
      errorId,
    },
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

// =============================================================================
// Build Admission Control
// =============================================================================

/**
 * Bounds how many PostGraphile schema builds run concurrently across ALL cache
 * keys (the single-flight map only dedups builds for the SAME key). Each build
 * transiently allocates hundreds of MB, so concurrent builds of different
 * tenants stack those peaks on top of the resident cache — the OOM shape.
 * Default 1: builds queue and run serially. Override with GRAPHILE_BUILD_CONCURRENCY.
 */
class BuildSemaphore {
  private active = 0;
  private waiters: Array<() => void> = [];
  constructor(private readonly capacity: number) {}

  async acquire(): Promise<void> {
    if (this.active < this.capacity) {
      this.active++;
      return;
    }
    await new Promise<void>((resolve) => this.waiters.push(resolve));
    this.active++;
  }

  release(): void {
    this.active = Math.max(0, this.active - 1);
    const wake = this.waiters.shift();
    if (wake) wake();
  }

  /** Number of builds currently queued (blocked on a free slot). */
  get queueDepth(): number {
    return this.waiters.length;
  }
}

const parseBuildConcurrency = (): number => {
  const raw = process.env.GRAPHILE_BUILD_CONCURRENCY;
  const n = raw ? parseInt(raw, 10) : 1;
  return Number.isFinite(n) && n > 0 ? n : 1;
};

const buildSemaphore = new BuildSemaphore(parseBuildConcurrency());

/**
 * Returns the number of PostGraphile schema builds currently queued behind the
 * build-concurrency semaphore. A persistently non-zero depth means builds are
 * arriving faster than they can be serialized — a leading indicator of build
 * backpressure under load. Exposed for the metrics sampler.
 */
export function getBuildQueueDepth(): number {
  return buildSemaphore.queueDepth;
}

// =============================================================================
// In-Process Build Counters (metrics)
// =============================================================================

export interface GraphileCounters {
  /** Total PostGraphile schema builds started (past coalescing + the semaphore). */
  builds: number;
  /** Requests routed to a shared blueprint (pooling) instance. */
  poolingAttaches: number;
  /** Builds that were pooled (shared-blueprint) builds. */
  poolingBuilds: number;
  /** Requests that gave up waiting on a build (GRAPHILE_BUILD_TIMEOUT_MS) and got 503. */
  buildWaitTimeouts: number;
}

/**
 * Cumulative in-process build counters for the metrics sampler. Mutated where a build
 * starts and where a [pooling] attach/build happens. Zero overhead when the sampler is
 * off — these are integer bumps on paths that already do real build work.
 */
const graphileCounters: GraphileCounters = {
  builds: 0,
  poolingAttaches: 0,
  poolingBuilds: 0,
  buildWaitTimeouts: 0
};

/** Snapshot the build counters. Returns a copy so callers cannot mutate live state. */
export function getGraphileCounters(): GraphileCounters {
  return { ...graphileCounters };
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
  pool: Pool,
  schemas: string[],
  anonRole: string,
  roleName: string,
  databaseSettings?: DatabaseSettings,
  options?: { pooling?: boolean },
): GraphileConfig.Preset => {
  // When pooling, the instance is shared across tenants of the same schema-shape
  // and routed per request via a search_path pgSetting (see grafast.context below).
  const pooling = options?.pooling === true;
  const preset: GraphileConfig.Preset = {
  extends: [createConstructivePreset(databaseSettings)],
  plugins: [AuthCookiePlugin],
  pgServices: [
    makePgService({
      pool,
      schemas,
    }),
  ],
  grafserv: {
    graphqlPath: '/graphql',
    graphiqlPath: '/graphiql',
    // GraphiQL (ruru) assets/handlers are per-instance overhead and an unnecessary
    // prod surface — enable only in development, or explicitly via GRAPHILE_GRAPHIQL=true.
    graphiql: getNodeEnv() === 'development' || process.env.GRAPHILE_GRAPHIQL === 'true',
    graphiqlOnGraphQLGET: false,
    maskError,
  },
  grafast: {
    explain: process.env.NODE_ENV === 'development',
    context: (requestContext: Partial<Grafast.RequestContext>) => {
      // In grafserv/express/v4, the request is available at requestContext.expressv4.req
      const req = (requestContext as { expressv4?: { req?: Request } })?.expressv4?.req;
      const context: Record<string, string> = {};

      // De-closure the role names: read them from the resolved API on the request
      // so a shared (pooled) instance uses the REQUESTING tenant's roles rather than
      // whichever tenant happened to build it. Falls back to the build-time params.
      const api = req?.api;
      const role = api?.roleName ?? roleName;
      const anon = api?.anonRole ?? anonRole;

      if (req) {
        if (req.databaseId) {
          context['jwt.claims.database_id'] = req.databaseId;
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
            role,
            'jwt.claims.token_id': req.token.id,
            'jwt.claims.user_id': req.token.user_id,
            ...context,
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

          // Pooled instances emit search_path-relative SQL; route this request to
          // the REQUESTING tenant's physical schemas (+ shared `public` last — see
          // tenantSearchPath). Never set when not pooling.
          if (pooling && api?.schema?.length) {
            pgSettings['search_path'] = tenantSearchPath(api.schema);
          }

          return { pgSettings };
        }
      }

      const anonSettings: Record<string, string> = {
        role: anon,
        ...context,
      };
      if (req?.requestId) {
        anonSettings['request.id'] = req.requestId;
      }
      // Pooled instances emit search_path-relative SQL; route this request to
      // the REQUESTING tenant's physical schemas (+ shared `public` last — see
      // tenantSearchPath). Never set when not pooling.
      if (pooling && api?.schema?.length) {
        anonSettings['search_path'] = tenantSearchPath(api.schema);
      }

      return {
        pgSettings: anonSettings,
      };
    },
  },
  };

  if (pooling) {
    // Stock unqualified-identifier gather + our schema flag so Constructive
    // plugins emit search_path-relative SQL for tenant-data references. Cast:
    // `constructiveUnqualified` is our custom schema option, absent from base types.
    (preset as any).gather = { pgIdentifiers: 'unqualified' };
    (preset as any).schema = { constructiveUnqualified: true };
  }

  return preset;
};

export const graphile = (opts: ConstructiveOptions): RequestHandler => {
  const observabilityEnabled = isGraphqlObservabilityEnabled(opts.server?.host);

  return async (req: Request, res: Response, next: NextFunction) => {
    const label = reqLabel(req);
    try {
      const api = req.api;
      if (!api) {
        log.error(`${label} Missing API info`);
        return res.status(500).send('Missing API info');
      }
      const svcKey = req.svc_key;
      if (!svcKey) {
        log.error(`${label} Missing service cache key`);
        return res.status(500).send('Missing service cache key');
      }
      const { dbname, anonRole, roleName, schema } = api;
      const schemaLabel = schema?.join(',') || 'unknown';

      // =========================================================================
      // Blueprint Pooling Decision (opt-in via GRAPHILE_BLUEPRINT_POOLING)
      //
      // When enabled, resolve a shared blueprint key so tenants of the same
      // schema-shape attach to ONE instance, routed per request via search_path
      // (set in grafast.context). Decisions are memoized per svc_key and cleared
      // on flush. When the flag is OFF this block is skipped entirely: `key` stays
      // exactly req.svc_key and no extra pool or queries are touched.
      // =========================================================================
      const pgConfig = getPgEnvOptions({ ...opts.pg, database: dbname });
      let key = svcKey;
      let pooling = false;
      let pool: Pool | undefined;
      if (isBlueprintPoolingEnabled() && api) {
        // Blueprint keying needs the tenant pool to fingerprint the schema shape.
        pool = getPgPool(pgConfig);
        const decision = await resolvePoolDecision(svcKey, api, pool);
        key = decision.key;
        pooling = decision.pooling;
        if (pooling) {
          graphileCounters.poolingAttaches += 1;
          log.info(`[pooling] svc=${svcKey} → ${key}`);
        }
      }

      // =========================================================================
      // Phase A: Cache Check (fast path)
      // =========================================================================
      const cached = graphileCache.get(key);
      if (cached) {
        if (invokeEntryHandler(cached, req, res, next)) {
          log.debug(`${label} PostGraphile cache hit key=${key} db=${dbname} schemas=${schemaLabel}`);
          return;
        }
        // Entry is mid-disposal — fall through and rebuild.
        log.debug(`${label} PostGraphile cache hit on disposing entry key=${key}; rebuilding`);
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
          if (invokeEntryHandler(instance, req, res, next)) {
            return;
          }
          log.debug(`${label} Coalesced instance already disposing for PostGraphile[${key}], retrying`);
          // Fall through to Phase C to retry creation
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
      if (recheckedCache && invokeEntryHandler(recheckedCache, req, res, next)) {
        log.debug(`${label} PostGraphile cache hit on re-check key=${key}`);
        return;
      }

      // Re-check in-flight map (another retry may have started creation)
      const retryInFlight = creating.get(key);
      if (retryInFlight) {
        log.debug(`${label} Re-coalescing request for PostGraphile[${key}]`);
        const retryInstance = await retryInFlight;
        if (invokeEntryHandler(retryInstance, req, res, next)) {
          return;
        }
        log.warn(`${label} Re-coalesced instance already disposing for PostGraphile[${key}]`);
        return res.status(503).json({
          error: { code: 'SERVICE_ROTATING', message: 'Service is restarting, please retry' }
        });
      }

      // Memory governor gate: at critical heap pressure a build's transient
      // allocation (hundreds of MB to >700MB on large catalogs) would abort the
      // whole process. Resident instances keep serving; only NEW builds refuse.
      const pressure = shouldRefuseBuild();
      if (pressure.refuseBuild) {
        res.setHeader('Retry-After', '15');
        return res.status(503).json({
          error: {
            code: 'SERVICE_OVERLOADED',
            message: 'Server is at critical memory pressure; retry shortly'
          }
        });
      }

      log.info(
        `${label} Building PostGraphile v5 handler key=${key} db=${dbname} schemas=${schemaLabel} role=${roleName} anon=${anonRole}`,
      );

      // Route through pg-cache so the pool is tracked and can be cleaned up
      // properly, preventing leaked connections during database teardown. When the
      // pooling decision above already resolved the pool, reuse it (pg-cache memoizes
      // regardless); otherwise resolve it here exactly as before (flag-off path).
      const activePool = pool ?? getPgPool(pgConfig);

      // Create promise and store in in-flight map BEFORE try block
      const preset = buildPreset(activePool, schema || [], anonRole, roleName, api.databaseSettings, { pooling });
      const creationPromise = (async (): Promise<GraphileCacheEntry> => {
        // Serialize builds process-wide: each build transiently allocates hundreds of MB,
        // and only same-key builds are deduped by the single-flight map above.
        await buildSemaphore.acquire();
        try {
          // While queued for the slot another request may have finished this key.
          const builtMeanwhile = graphileCache.get(key);
          if (builtMeanwhile) {
            return builtMeanwhile;
          }
          // Evict the LRU instance BEFORE building so the build peak lands on freed
          // headroom instead of stacking on a full cache.
          ensureCacheHeadroom(1);
          // A build genuinely starts here: past single-flight coalescing, past the
          // build semaphore, and past the built-meanwhile re-check.
          graphileCounters.builds += 1;
          if (pooling) {
            graphileCounters.poolingBuilds += 1;
          }
          return await observeGraphileBuild(
            {
              cacheKey: key,
              serviceKey: key,
              databaseId: api.databaseId ?? null,
            },
            () => createGraphileInstance({
              preset,
              cacheKey: key,
              dbname,
              enableRealtime: api.databaseSettings?.enableRealtime,
            }),
            { enabled: observabilityEnabled },
          );
        } finally {
          buildSemaphore.release();
        }
      })();
      creating.set(key, creationPromise);

      // Populate the cache and clear the in-flight slot when the BUILD settles
      // (not when this request finishes): a request that stops waiting
      // (build-timeout below) must leave coalescing intact for followers, and
      // the finished build must land in the cache for their retries.
      creationPromise
        .then((instance) => {
          graphileCache.set(key, instance);
          log.info(`${label} Cached PostGraphile v5 handler key=${key} db=${dbname}`);
        })
        .catch(() => {
          /* logged by the awaiting branch (or a coalesced waiter) below */
        })
        .finally(() => {
          creating.delete(key);
        });

      try {
        // Bound how long a REQUEST waits on a build (queue time + build time).
        // The build itself is not cancelled — makeSchema cannot be aborted —
        // it completes in the background and fills the cache for retries.
        const timeoutMs = (() => {
          const n = parseInt(process.env.GRAPHILE_BUILD_TIMEOUT_MS || '', 10);
          return Number.isFinite(n) && n > 0 ? n : 180_000;
        })();
        const instance = await Promise.race([
          creationPromise,
          new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs).unref?.())
        ]);
        if (instance === null) {
          graphileCounters.buildWaitTimeouts += 1;
          log.warn(`${label} Request timed out after ${timeoutMs}ms waiting for PostGraphile[${key}] build`);
          res.setHeader('Retry-After', '15');
          return res.status(503).json({
            error: { code: 'BUILD_TIMEOUT', message: 'Schema build in progress; retry shortly' }
          });
        }
        if (invokeEntryHandler(instance, req, res, next)) {
          return;
        }
        log.warn(`${label} Freshly built instance already disposing for PostGraphile[${key}]`);
        return res.status(503).json({
          error: { code: 'SERVICE_ROTATING', message: 'Service is restarting, please retry' }
        });
      } catch (error) {
        log.error(`${label} Failed to create PostGraphile[${key}]:`, error);
        throw new HandlerCreationError(
          `Failed to create handler for ${key}: ${error instanceof Error ? error.message : String(error)}`,
          {
            cacheKey: key,
            cause: error instanceof Error ? error.message : String(error),
          },
        );
      }
    } catch (e: any) {
      log.error(`${label} PostGraphile middleware error`, e);
      if (!res.headersSent) {
        return res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }
        });
      }
      next(e);
    }
  };
};
