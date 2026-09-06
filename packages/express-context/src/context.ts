/**
 * context — Builds `req.constructive` from resolved API + auth token
 *
 * This middleware runs AFTER the API resolver and auth middleware have
 * populated `req.api` and `req.token`. It composes:
 *
 *   - pgSettings (role, claims, request_id, database_id)
 *   - Tenant database pool (via pg-cache)
 *   - withPgClient (transaction-scoped RLS helper)
 *   - Convenience fields (userId, databaseId, requestId)
 *   - useModule (lazy, on-demand per-database module resolution)
 *
 * The result is a single `req.constructive` object that any downstream
 * route handler can use for tenant-scoped database operations.
 */

import type { PgpmOptions } from '@pgpmjs/types';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { Pool } from 'pg';
import {
  acquirePgPool,
  getPgPool,
  getPgPoolIdentity,
  type GetPgPoolOptions,
  type PgPoolLease
} from 'pg-cache';

import type { BillingClient } from './billing-client';
import { createBillingClient } from './billing-client';
import type { LoaderRegistry } from './loaders/registry';
import type { LoaderContext } from './loaders/types';
import { withPgClient as withPgClientFn } from './pg-client';
import { buildPgSettings } from './pg-settings';
import type { ApiStructure, BillingConfig, BuiltinModuleMap, ConstructiveContext, InferenceLogConfig, LlmConfig } from './types';

type PoolConfig = Parameters<typeof acquirePgPool>[0];

/**
 * Secret-bearing connection config resolved by the owning server, paired with
 * the opaque identity that both request context and Graphile must consume.
 */
export interface RuntimePgPoolResolution {
  pgConfig: PoolConfig;
  poolIdentity: string;
}

export interface ContextMiddlewareOptions {
  /** Base PG options for pool creation (host, port, user, password) */
  pg?: PgpmOptions['pg'];
  /** Least-privilege tenant execution login; inherits unspecified pg fields. */
  runtimePg?: PgpmOptions['pg'];
  /**
   * Read the server-owned request resolution. Implementations should keep raw
   * credentials outside the Express request object (for example in a WeakMap).
   */
  getRuntimePgResolution?: (
    req: Request,
    api: ApiStructure
  ) => Readonly<RuntimePgPoolResolution>;
  /** Optional fail-closed admission check for the tenant execution pool. */
  validateRuntimePool?: (pool: Pool, api: ApiStructure) => Promise<void>;
  /** Ordered, audited extension/shared schemas used by request SQL. */
  dependencySchemas?: readonly string[];
  /** Module loader registry for per-database cached lookups */
  loaders?: LoaderRegistry;
  /** Routing-plane schema loaders query (defaults to routing_public) */
  routingSchema?: string;
}

interface ResolvedPool {
  pool: Pool;
  identity: string;
}

const resolvePool = (
  config: PoolConfig,
  options: GetPgPoolOptions,
  leases?: PgPoolLease[]
): ResolvedPool => {
  if (!leases) {
    return {
      pool: getPgPool(config, options),
      identity: getPgPoolIdentity(config, options)
    };
  }
  const lease = acquirePgPool(config, options);
  leases.push(lease);
  return { pool: lease.pool, identity: lease.identity };
};

/**
 * Create a `useModule` function bound to the given loader context.
 *
 * Calling `useModule('rlsModule')` lazily resolves the RLS loader according to
 * that loader's freshness policy. The function is a no-op (returns undefined)
 * when no registry is configured.
 */
function createUseModule(
  registry: LoaderRegistry | undefined,
  loaderCtx: LoaderContext | null
): ConstructiveContext['useModule'] {
  return (async <K extends keyof BuiltinModuleMap>(name: K | string) => {
    if (!registry || !loaderCtx) return undefined;
    return registry.resolve(name as string, loaderCtx);
  }) as ConstructiveContext['useModule'];
}

/**
 * Build the ConstructiveContext from the current request state.
 *
 * Requires `req.api` and `req.requestId` to be set by upstream middleware.
 * `req.token` is optional (anonymous requests get null).
 *
 * Module loaders are NOT resolved eagerly. Instead, `ctx.useModule(name)`
 * resolves them on demand — only the modules that middleware actually
 * needs will fire SQL queries.
 */
export function buildContext(
  req: Request,
  opts: ContextMiddlewareOptions = {},
  /** Internal request lifetime. Omit for backwards-compatible direct use. */
  poolLeases?: PgPoolLease[]
): ConstructiveContext | null {
  const api = req.api;
  if (!api) return null;

  const token = req.token ?? null;
  const requestId = req.requestId || '';

  const pgSettings = buildPgSettings({
    api,
    token,
    requestId,
    clientIp: req.clientIp,
    origin: req.get('origin'),
    userAgent: req.get('User-Agent'),
    deviceToken: req.deviceToken,
    dependencySchemas: opts.dependencySchemas
  });

  const suppliedRuntimeResolution = opts.getRuntimePgResolution
    ? opts.getRuntimePgResolution(req, api)
    : undefined;
  if (opts.getRuntimePgResolution && !suppliedRuntimeResolution) {
    throw new Error(
      'Runtime PostgreSQL resolution provider returned no exact identity'
    );
  }
  const runtimeConfig = suppliedRuntimeResolution?.pgConfig ?? {
    ...opts.pg,
    ...opts.runtimePg,
    database: api.dbname
  };
  const runtimePool = resolvePool(
    runtimeConfig,
    { purpose: 'runtime', sanitizeOnCheckout: true },
    poolLeases
  );
  if (
    suppliedRuntimeResolution
    && runtimePool.identity !== suppliedRuntimeResolution.poolIdentity
  ) {
    throw new Error(
      'Resolved runtime PostgreSQL pool identity changed before context acquisition'
    );
  }
  const tenantPool = runtimePool.pool;

  // Build loader context (if registry provided and databaseId known)
  let loaderCtx: LoaderContext | null = null;
  if (opts.loaders && api.databaseId) {
    const routingPool = resolvePool(opts.pg ?? {}, {
      purpose: 'routing-request-control',
      sanitizeOnCheckout: true
    }, poolLeases);
    const controlTenantPool = resolvePool({
      ...opts.pg,
      database: api.dbname
    }, {
      purpose: 'tenant-request-control',
      sanitizeOnCheckout: true
    }, poolLeases);
    loaderCtx = {
      routingPool: routingPool.pool,
      routingPoolIdentity: routingPool.identity,
      routingSchema: opts.routingSchema,
      tenantPool: controlTenantPool.pool,
      tenantPoolIdentity: controlTenantPool.identity,
      databaseId: api.databaseId,
      apiId: api.apiId,
      dbname: api.dbname
    };
  }

  let runtimeSafetyPromise: Promise<void> | null = null;
  const ensureRuntimePoolIsSafe = (): Promise<void> => {
    if (!opts.validateRuntimePool) return Promise.resolve();
    runtimeSafetyPromise ??= opts.validateRuntimePool(tenantPool, api);
    return runtimeSafetyPromise;
  };
  const withPgClient = <T>(fn: (client: any) => Promise<T>) =>
    ensureRuntimePoolIsSafe().then(() => withPgClientFn(tenantPool, pgSettings, fn));
  const useModule = createUseModule(opts.loaders, loaderCtx);

  // Lazy-initialized billing client (cached per request)
  let billingClient: BillingClient | null | undefined;
  // Lazy-initialized LLM config (cached per request)
  let llmConfig: LlmConfig | null | undefined;

  return {
    api,
    token,
    pgSettings,
    databaseId: api.databaseId ?? null,
    userId: token?.user_id ?? null,
    requestId,
    pool: tenantPool,
    runtimePoolIdentity: runtimePool.identity,
    withPgClient,
    useModule,
    async useBilling() {
      if (billingClient !== undefined) return billingClient;

      const entityId = token?.entity_id as string | undefined;
      if (!entityId) {
        billingClient = null;
        return null;
      }

      const [billing, inferenceLog] = await Promise.all([
        useModule('billing') as Promise<BillingConfig | undefined>,
        useModule('inferenceLog') as Promise<InferenceLogConfig | undefined>
      ]);

      if (!billing) {
        billingClient = null;
        return null;
      }

      billingClient = createBillingClient(
        withPgClient,
        entityId,
        billing,
        inferenceLog ?? null
      );
      return billingClient;
    },
    async useLlm() {
      if (llmConfig !== undefined) return llmConfig;
      const resolved = await useModule('llm') as LlmConfig | undefined;
      llmConfig = resolved ?? null;
      return llmConfig;
    }
  };
}

/**
 * Express middleware that builds `req.constructive` from the resolved
 * API config and auth token.
 *
 * Mount AFTER the API resolver and auth middleware:
 *
 * ```typescript
 * import { createContextMiddleware, createDefaultRegistry } from '@constructive-io/express-context';
 *
 * const loaders = createDefaultRegistry();
 *
 * app.use(apiMiddleware);       // sets req.api
 * app.use(authMiddleware);      // sets req.token
 * app.use(createContextMiddleware({ loaders }));
 *
 * // Downstream middleware/routes call useModule on demand:
 * app.post('/v1/chat', async (req, res) => {
 *   const ctx = req.constructive;
 *   const rls = await ctx.useModule('rlsModule');        // authoritative read
 *   const auth = await ctx.useModule('authSettings');    // authoritative read
 *   // webauthnSettings loader never fires if nobody asks for it
 * });
 * ```
 */
export function createContextMiddleware(
  opts: ContextMiddlewareOptions = {}
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestEnded = (): boolean =>
      Boolean(
        req.aborted
        || req.socket?.destroyed
        || res.destroyed
        || res.writableEnded
      );
    if (requestEnded()) return;

    const leases: PgPoolLease[] = [];
    let released = false;
    const releaseLeases = (): void => {
      if (released) return;
      released = true;
      req.removeListener('aborted', releaseLeases);
      res.removeListener('finish', releaseLeases);
      res.removeListener('close', releaseLeases);
      for (const lease of leases.reverse()) lease.release();
    };

    try {
      const ctx = buildContext(req, opts, leases);
      if (!ctx) {
        releaseLeases();
        next();
        return;
      }
      req.constructive = ctx;
      req.once('aborted', releaseLeases);
      res.once('finish', releaseLeases);
      res.once('close', releaseLeases);
      // The response may have ended while the synchronous context builder was
      // acquiring its pool leases, before these listeners could be attached.
      if (requestEnded()) {
        releaseLeases();
        return;
      }
      next();
    } catch (error) {
      releaseLeases();
      next(error);
    }
  };
}
