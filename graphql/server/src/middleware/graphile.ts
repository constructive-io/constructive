import crypto from 'node:crypto';
import { getNodeEnv } from '@pgpmjs/env';
import type { ConstructiveOptions } from '@constructive-io/graphql-types';
import { Logger } from '@pgpmjs/logger';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { GraphQLError, GraphQLFormattedError } from 'grafast/graphql';
import { createGraphileInstance, type GraphileCacheEntry, graphileCache } from 'graphile-cache';
import type { GraphileConfig } from 'graphile-config';
import { ConstructivePreset, makePgService } from 'graphile-settings';
import { getPgPool } from 'pg-cache';
import { getPgEnvOptions } from 'pg-env';
import './types'; // for Request type
import { isGraphqlObservabilityEnabled } from '../diagnostics/observability';
import { HandlerCreationError } from '../errors/api-errors';
import { observeGraphileBuild } from './observability/graphile-build-stats';
import { CookiePlugin } from './cookie-plugin';

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

const log = new Logger('graphile');
const reqLabel = (req: Request): string => (req.requestId ? `[${req.requestId}]` : '[req]');

/**
 * Build a PostGraphile v5 preset for a tenant.
 */
const buildPreset = (
  pool: import('pg').Pool,
  schemas: string[],
  anonRole: string,
  roleName: string,
): GraphileConfig.Preset => {
  return {
  extends: [ConstructivePreset],
  plugins: [CookiePlugin],
  pgServices: [
    makePgService({
      pool,
      schemas,
    }),
  ],
  grafserv: {
    graphqlPath: '/graphql',
    graphiqlPath: '/graphiql',
    graphiql: true,
    graphiqlOnGraphQLGET: false,
    maskError,
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
        if (req.clientIp) {
          context['jwt.claims.ip_address'] = req.clientIp;
        }
        if (req.get('origin')) {
          context['jwt.claims.origin'] = req.get('origin') as string;
        }
        if (req.get('User-Agent')) {
          context['jwt.claims.user_agent'] = req.get('User-Agent') as string;
        }

        if (req.token?.user_id) {
          const pgSettings: Record<string, string> = {
            role: roleName,
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

          // Enforce read-only transactions for read_only credentials (API keys, etc.)
          if (req.token.access_level === 'read_only') {
            pgSettings['default_transaction_read_only'] = 'on';
          }

          return { pgSettings };
        }
      }

      return {
        pgSettings: {
          role: anonRole,
          ...context,
        },
      };
    },
  },
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
        return res.status(500).send('Missing API info');
      }
      const key = req.svc_key;
      if (!key) {
        log.error(`${label} Missing service cache key`);
        return res.status(500).send('Missing service cache key');
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
        `${label} Building PostGraphile v5 handler key=${key} db=${dbname} schemas=${schemaLabel} role=${roleName} anon=${anonRole}`,
      );

      const pgConfig = getPgEnvOptions({
        ...opts.pg,
        database: dbname,
      });

      // Route through pg-cache so the pool is tracked and can be cleaned up
      // properly, preventing leaked connections during database teardown.
      const pool = getPgPool(pgConfig);

      // Create promise and store in in-flight map BEFORE try block
      const preset = buildPreset(pool, schema || [], anonRole, roleName);
      const creationPromise = observeGraphileBuild(
        {
          cacheKey: key,
          serviceKey: key,
          databaseId: api.databaseId ?? null,
        },
        () => createGraphileInstance({ preset, cacheKey: key }),
        { enabled: observabilityEnabled },
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
            cause: error instanceof Error ? error.message : String(error),
          },
        );
      } finally {
        // Always clean up in-flight tracker
        creating.delete(key);
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
