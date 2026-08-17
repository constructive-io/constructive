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

import type {
  RuntimePgConfig,
  RuntimePgResolver,
  RuntimePgResolverInput,
} from '@constructive-io/graphql-types';
import type { PgpmOptions } from '@pgpmjs/types';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { Pool } from 'pg';
import {
  acquirePgPool,
  getPgPool,
  getPgPoolIdentity,
  type GetPgPoolOptions,
  type PgPoolLease,
} from 'pg-cache';

import type { BillingClient } from './billing-client';
import { createBillingClient } from './billing-client';
import type { LoaderRegistry } from './loaders/registry';
import type { LoaderContext } from './loaders/types';
import { withPgClient as withPgClientFn } from './pg-client';
import { buildPgSettings } from './pg-settings';
import type {
  ApiStructure,
  BillingConfig,
  BuiltinModuleMap,
  ConstructiveContext,
  InferenceLogConfig,
  LlmConfig,
} from './types';

type PoolConfig = Parameters<typeof acquirePgPool>[0];

/** Secret-bearing config paired with its process-local opaque identity. */
export interface RuntimePgPoolResolution {
  pgConfig: PoolConfig;
  poolIdentity: string;
}

export interface ContextMiddlewareOptions {
  /** Base PG options for pool creation (host, port, user, password) */
  pg?: PgpmOptions['pg'];
  /** Static least-privilege tenant execution login. */
  runtimePg?: RuntimePgConfig;
  /** Exact route authorized to use `runtimePg`. */
  runtimePgStaticIdentity?: RuntimePgResolverInput;
  /** Resolve one least-privilege login from credential-free route facts. */
  runtimePgResolver?: RuntimePgResolver;
  /** Module loader registry for per-database cached lookups */
  loaders?: LoaderRegistry;
  /** Routing-plane schema loaders query (defaults to routing_public) */
  routingSchema?: string;
  /** Ordered, audited extension/shared schemas required by request SQL. */
  dependencySchemas?: readonly string[];
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
      identity: getPgPoolIdentity(config, options),
    };
  }
  const lease = acquirePgPool(config, options);
  leases.push(lease);
  return { pool: lease.pool, identity: lease.identity };
};

const requireRouteFact = (value: unknown, name: string): string => {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Runtime PostgreSQL route requires ${name}`);
  }
  return value;
};

const runtimeRouteInput = (
  api: ApiStructure
): Readonly<RuntimePgResolverInput> =>
  Object.freeze({
    databaseId: requireRouteFact(api.databaseId, 'databaseId'),
    databaseName: requireRouteFact(api.dbname, 'databaseName'),
    apiId: requireRouteFact(api.apiId, 'apiId'),
    schemas: Object.freeze([...api.schema]),
    roles: Object.freeze([
      requireRouteFact(api.anonRole, 'anonymous role'),
      requireRouteFact(api.roleName, 'authenticated role'),
    ]) as readonly [string, string],
  });

const sameRuntimeRoute = (
  left: Readonly<RuntimePgResolverInput>,
  right: Readonly<RuntimePgResolverInput>
): boolean =>
  left.databaseId === right.databaseId &&
  left.databaseName === right.databaseName &&
  left.apiId === right.apiId &&
  left.schemas.length === right.schemas.length &&
  left.schemas.every((schema, index) => schema === right.schemas[index]) &&
  left.roles[0] === right.roles[0] &&
  left.roles[1] === right.roles[1];

const requireExplicitRuntimeConfig = (
  candidate: RuntimePgConfig,
  route: Readonly<RuntimePgResolverInput>,
  controlPg: PgpmOptions['pg'] | undefined
): PoolConfig => {
  if (!candidate || typeof candidate !== 'object') {
    throw new Error(
      'Runtime PostgreSQL resolver returned an invalid configuration'
    );
  }
  for (const field of ['database', 'user', 'password'] as const) {
    if (
      typeof candidate[field] !== 'string' ||
      candidate[field]!.length === 0
    ) {
      throw new Error(
        `Runtime PostgreSQL configuration requires explicit ${field}`
      );
    }
  }
  if (candidate.database !== route.databaseName) {
    throw new Error(
      'Runtime PostgreSQL database does not match the resolved route'
    );
  }
  return { ...controlPg, ...candidate };
};

const makeRuntimeResolution = (
  candidate: RuntimePgConfig,
  route: Readonly<RuntimePgResolverInput>,
  controlPg: PgpmOptions['pg'] | undefined
): Readonly<RuntimePgPoolResolution> => {
  const pgConfig = requireExplicitRuntimeConfig(candidate, route, controlPg);
  return Object.freeze({
    pgConfig,
    poolIdentity: getPgPoolIdentity(pgConfig, { purpose: 'runtime' }),
  });
};

const isPromiseLike = <T>(value: T | Promise<T>): value is Promise<T> =>
  typeof (value as Promise<T>)?.then === 'function';

const resolveConfiguredRuntime = (
  api: ApiStructure,
  opts: ContextMiddlewareOptions
):
  | Readonly<RuntimePgPoolResolution>
  | Promise<Readonly<RuntimePgPoolResolution>>
  | undefined => {
  if (opts.runtimePgResolver && opts.runtimePg) {
    throw new Error(
      'Configure either runtimePgResolver or runtimePg, not both'
    );
  }
  if (!opts.runtimePgResolver && !opts.runtimePg) return undefined;
  const route = runtimeRouteInput(api);
  if (opts.runtimePgResolver) {
    const candidate = opts.runtimePgResolver(route);
    return isPromiseLike(candidate)
      ? Promise.resolve(candidate).then((resolved) =>
        makeRuntimeResolution(resolved, route, opts.pg)
      )
      : makeRuntimeResolution(candidate, route, opts.pg);
  }
  if (!opts.runtimePgStaticIdentity) {
    throw new Error(
      'Static runtime PostgreSQL requires runtimePgStaticIdentity'
    );
  }
  if (!sameRuntimeRoute(route, opts.runtimePgStaticIdentity)) {
    throw new Error(
      'Static runtime PostgreSQL identity does not match the resolved route'
    );
  }
  return makeRuntimeResolution(opts.runtimePg, route, opts.pg);
};

/**
 * Create a `useModule` function bound to the given loader context.
 *
 * Calling `useModule('rlsModule')` lazily resolves the RLS loader,
 * hitting the DB only on cache miss. The function is a no-op (returns
 * undefined) when no registry is configured.
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
  /** Internal request lifetime; omitted for backwards-compatible direct use. */
  poolLeases?: PgPoolLease[],
  /** Internal async resolver result; raw credentials never enter the request. */
  suppliedRuntimeResolution?: Readonly<RuntimePgPoolResolution>
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
    dependencySchemas: opts.dependencySchemas,
  });

  let runtimeResolution = suppliedRuntimeResolution;
  if (!runtimeResolution) {
    if (opts.runtimePgResolver) {
      throw new Error(
        'runtimePgResolver must be used through createContextMiddleware'
      );
    }
    const configured = resolveConfiguredRuntime(api, opts);
    runtimeResolution = configured as
      Readonly<RuntimePgPoolResolution> | undefined;
  }
  const runtimeConfig = runtimeResolution?.pgConfig ?? {
    ...opts.pg,
    database: api.dbname,
  };
  const runtimePool = resolvePool(
    runtimeConfig,
    { purpose: 'runtime' },
    poolLeases
  );
  if (
    runtimeResolution &&
    runtimePool.identity !== runtimeResolution.poolIdentity
  ) {
    throw new Error(
      'Resolved runtime PostgreSQL pool identity changed before acquisition'
    );
  }
  const tenantPool = runtimePool.pool;

  // Build loader context (if registry provided and databaseId known)
  let loaderCtx: LoaderContext | null = null;
  if (opts.loaders && api.databaseId) {
    const routingPool = resolvePool(
      opts.pg ?? {},
      { purpose: 'routing-request-control' },
      poolLeases
    );
    const controlTenantPool = resolvePool(
      { ...opts.pg, database: api.dbname },
      { purpose: 'tenant-request-control' },
      poolLeases
    );
    loaderCtx = {
      routingPool: routingPool.pool,
      routingSchema: opts.routingSchema,
      tenantPool: controlTenantPool.pool,
      databaseId: api.databaseId,
      apiId: api.apiId,
      dbname: api.dbname
    };
  }

  const withPgClient = <T>(fn: (client: any) => Promise<T>) =>
    withPgClientFn(tenantPool, pgSettings, fn);
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
 *   const rls = await ctx.useModule('rlsModule');       // only fires if not cached
 *   const auth = await ctx.useModule('authSettings');    // only fires if not cached
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
        req.aborted ||
        req.socket?.destroyed ||
        res.destroyed ||
        res.writableEnded
      );
    if (requestEnded()) return;

    const finish = (
      runtimeResolution?: Readonly<RuntimePgPoolResolution>
    ): void => {
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
        const ctx = buildContext(req, opts, leases, runtimeResolution);
        if (!ctx) {
          releaseLeases();
          next();
          return;
        }
        req.constructive = ctx;
        req.once('aborted', releaseLeases);
        res.once('finish', releaseLeases);
        res.once('close', releaseLeases);
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

    try {
      const api = req.api;
      if (!api) {
        next();
        return;
      }
      const resolution = resolveConfiguredRuntime(api, opts);
      if (isPromiseLike(resolution)) {
        void resolution.then(
          (resolved) => finish(resolved),
          (error) => {
            if (!requestEnded()) next(error);
          }
        );
      } else {
        finish(resolution);
      }
    } catch (error) {
      next(error);
    }
  };
}
