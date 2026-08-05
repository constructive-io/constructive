import './types';

import {
  createDefaultRegistry,
  LoaderContext,
  LoaderRegistry
} from '@constructive-io/express-context';
import { parseUrl } from '@constructive-io/url-domains';
import { Logger } from '@pgpmjs/logger';
import { svcCache } from '@pgpmjs/server-utils';
import { NextFunction, Request, Response } from 'express';
import { Pool } from 'pg';
import {
  acquirePgPool,
  getPgPoolIdentity,
  PG_POOL_CAPACITY_ERROR_CODE,
  type PgPoolLease
} from 'pg-cache';

import errorPage50x from '../errors/50x';
import errorPage404Message from '../errors/404-message';
import { ApiConfigResult, ApiError, ApiOptions, ApiStructure, AuthSettings, DatabaseSettings, PubkeyChallengeSettings, RlsModule, WebauthnSettings } from '../types';
import { authorizeInternalRequest } from './internal-request';
import {
  getRoutingSchema,
  isValidPhysicalSchemaName,
  isValidSchemaName,
  resolveRoute,
  routeToApiStructure
} from './routing';

const log = new Logger('api');

// =============================================================================
// Module Loader Registry (replaces inline SQL queries for per-db config)
// =============================================================================

const defaultRegistry: LoaderRegistry = createDefaultRegistry();

const SVC_CACHE_CONTRACT_VERSION = 'constructive-routing-cache:v1';

interface SvcCacheContract {
  routingPoolIdentity: string;
  routingSchema: string;
  serviceKey: string;
}

const getSvcCacheContract = (
  opts: ApiOptions,
  serviceKey: string
): SvcCacheContract => ({
  routingPoolIdentity: getPgPoolIdentity(opts.pg, {
    purpose: 'routing-request-control',
    sanitizeOnCheckout: true
  }),
  routingSchema: getRoutingSchema(opts),
  serviceKey
});

export const getSvcCacheKey = (
  opts: ApiOptions,
  serviceKey: string
): string => {
  const contract = getSvcCacheContract(opts, serviceKey);
  return JSON.stringify([
    SVC_CACHE_CONTRACT_VERSION,
    contract.routingPoolIdentity,
    contract.routingSchema,
    contract.serviceKey
  ]);
};

const parseSvcCacheKey = (key: string): SvcCacheContract | null => {
  try {
    const parsed = JSON.parse(key);
    if (
      !Array.isArray(parsed)
      || parsed.length !== 4
      || parsed[0] !== SVC_CACHE_CONTRACT_VERSION
      || parsed.slice(1).some((value) => typeof value !== 'string')
    ) {
      return null;
    }
    return {
      routingPoolIdentity: parsed[1],
      routingSchema: parsed[2],
      serviceKey: parsed[3]
    };
  } catch {
    return null;
  }
};

/** Invalidate one exact physical routing entry left by an older caller. */
export const invalidateSvcCacheKey = (cacheKey: string): boolean => {
  return svcCache.delete(cacheKey);
};

const invalidateSvcCacheWhere = (
  predicate: (contract: SvcCacheContract, value: unknown) => boolean
): number => {
  const keys: string[] = [];
  for (const [key, value] of svcCache.entries()) {
    const contract = parseSvcCacheKey(key);
    if (contract && predicate(contract, value)) keys.push(key);
  }
  for (const key of keys) svcCache.delete(key);
  return keys.length;
};

const sameSvcCacheScope = (
  left: SvcCacheContract,
  right: SvcCacheContract
): boolean =>
  left.routingPoolIdentity === right.routingPoolIdentity
  && left.routingSchema === right.routingSchema;

export const invalidateSvcCacheForService = (
  opts: ApiOptions,
  serviceKey: string
): number => {
  const expected = getSvcCacheContract(opts, serviceKey);
  return invalidateSvcCacheWhere((contract) =>
    sameSvcCacheScope(contract, expected)
    && contract.serviceKey === serviceKey
  );
};

export const invalidateSvcCacheForDatabase = (
  opts: ApiOptions,
  databaseId: string
): number => {
  const expected = getSvcCacheContract(opts, '');
  const apiPrefix = `api:${databaseId}:`;
  const schemataPrefix = `schemata:${databaseId}:`;
  const metaKey = `metaschema:api:${databaseId}`;
  return invalidateSvcCacheWhere((contract, value) => {
    if (!sameSvcCacheScope(contract, expected)) return false;
    const cachedDatabaseId = (value as { databaseId?: unknown })?.databaseId;
    return cachedDatabaseId === databaseId
      || contract.serviceKey.startsWith(apiPrefix)
      || contract.serviceKey.startsWith(schemataPrefix)
      || contract.serviceKey === metaKey;
  });
};

/** Clear process-wide routing metadata and retire every in-flight publication. */
export const clearSvcCache = (): void => {
  svcCache.clear();
};

// =============================================================================
// SQL Queries (API resolution only — module queries now live in loaders)
// =============================================================================

// Private-header X-Api-Name lookup against the scoped routing plane.
// X-Api-Name is a trusted internal selector (only honored when the server
// runs with isPublic=false): it addresses a database's API surface by name.
// `is_published` governs cross-scope route visibility, not internal
// addressability, so it does not filter this lookup.
const scopedApiNameLookupSql = (routingSchema: string): string => `
  SELECT 
    a.id as api_id,
    a.database_id,
    a.dbname,
    a.role_name,
    a.anon_role,
    a.is_published as is_public,
    COALESCE(array_agg(s.schema_name) FILTER (WHERE s.schema_name IS NOT NULL), '{}') as schemas
  FROM "${routingSchema}".apis a
  LEFT JOIN "${routingSchema}".api_schemas aps
    ON a.id = aps.api_id
   AND aps.database_id = a.database_id
  LEFT JOIN metaschema_public.schema s
    ON aps.schema_id = s.id
   AND s.database_id = a.database_id
  WHERE a.database_id = $1 
    AND a.name = $2
  GROUP BY a.id, a.database_id, a.dbname, a.role_name, a.anon_role, a.is_published
`;

// =============================================================================
// Types (API resolution only — module types now in express-context)
// =============================================================================

interface ApiRow {
  api_id: string;
  database_id: string;
  dbname: string;
  role_name: string;
  anon_role: string;
  is_public: boolean;
  schemas: string[];
}

interface ResolveContext {
  opts: ApiOptions;
  registry: LoaderRegistry;
  pool: Pool;
  routingPoolIdentity: string;
  leases: PgPoolLease[];
  domain: string;
  subdomain: string | null;
  cacheKey: string;
  headers: RoutingHeaders;
  host: string;
}

type ResolutionMode = 
  | 'api-name-header'
  | 'meta-schema-header'
  | 'scoped-route';

type PrivateHeaderMode = Exclude<ResolutionMode, 'scoped-route'>;

interface RoutingHeaders {
  apiName?: string;
  metaSchema?: string;
  databaseId?: string;
}

// =============================================================================
// Module Resolution (via loader registry)
// =============================================================================

interface ResolvedModuleSettings {
  rlsModule?: RlsModule;
  authSettings?: AuthSettings;
  corsOrigins?: string[];
  databaseSettings?: DatabaseSettings;
  pubkeyChallengeSettings?: PubkeyChallengeSettings;
  webauthnSettings?: WebauthnSettings;
}

export class MissingDatabaseFeatureContractError extends Error {
  readonly code = 'GRAPHILE_DATABASE_FEATURE_CONTRACT_MISSING';

  constructor(databaseId: string, apiId: string) {
    super(
      `No exact database feature contract resolved for database ${databaseId} and API ${apiId}`
    );
    this.name = 'MissingDatabaseFeatureContractError';
  }
}

/**
 * Build a LoaderContext from the API row and options.
 * This is used to resolve per-database module settings via the loader registry.
 */
const buildLoaderContext = (
  routingPool: Pool,
  routingPoolIdentity: string,
  opts: ApiOptions,
  row: ApiRow,
  leases: PgPoolLease[]
): LoaderContext => {
  // Scoped APIs leave dbname NULL when their schemas live in the serving
  // database (pooled tenants); fall back to the server's own database.
  const dbname = row.dbname || opts.pg?.database || '';
  const tenantLease = acquirePgPool(
    { ...opts.pg, database: dbname },
    { purpose: 'tenant-request-control', sanitizeOnCheckout: true }
  );
  leases.push(tenantLease);
  return {
    routingPool,
    routingPoolIdentity,
    routingSchema: getRoutingSchema(opts),
    tenantPool: tenantLease.pool,
    tenantPoolIdentity: tenantLease.identity,
    databaseId: row.database_id,
    apiId: row.api_id,
    dbname
  };
};

/**
 * Resolve all per-database module settings in parallel via the loader registry.
 * Each loader independently caches by databaseId — repeated calls are cheap.
 */
const resolveModuleSettings = async (
  registry: LoaderRegistry,
  ctx: LoaderContext
): Promise<ResolvedModuleSettings> => {
  const [
    rlsModule,
    authSettings,
    corsOrigins,
    databaseSettings,
    pubkeyChallengeSettings,
    webauthnSettings
  ] = await Promise.all([
    registry.resolve<RlsModule>('rlsModule', ctx),
    registry.resolve<AuthSettings>('authSettings', ctx),
    registry.resolve<string[]>('corsOrigins', ctx),
    registry.resolve<DatabaseSettings>('databaseSettings', ctx),
    registry.resolve<PubkeyChallengeSettings>('pubkeyChallengeSettings', ctx),
    registry.resolve<WebauthnSettings>('webauthnSettings', ctx)
  ]);

  // These flags select executable plugins, realtime, uploads, and search. A
  // missing metadata row must not silently expand the surface through preset
  // defaults on an otherwise authoritative tenant route.
  if (!databaseSettings) {
    throw new MissingDatabaseFeatureContractError(ctx.databaseId, ctx.apiId ?? '');
  }

  return {
    rlsModule,
    authSettings,
    corsOrigins,
    databaseSettings,
    pubkeyChallengeSettings,
    webauthnSettings
  };
};

// =============================================================================
// Helpers
// =============================================================================

const isApiError = (result: ApiConfigResult): result is ApiError =>
  !!result && typeof (result as ApiError).errorHtml === 'string';

/**
 * Every resolved API surface must carry a database id — there is no default
 * database. A resolved structure without one is a misconfiguration; fail loud
 * rather than silently proceeding with an undefined tenant.
 */
const assertDatabaseId = (result: ApiStructure): void => {
  if (!result.databaseId) {
    const error = new Error(
      'No database id resolved for this request. A database id is required; there is no default database.'
    ) as Error & { code?: string };
    error.code = 'NO_DATABASE_ID';
    throw error;
  }
};

const getPrivateHeaderMode = (headers: RoutingHeaders): PrivateHeaderMode | null => {
  if (headers.apiName) return 'api-name-header';
  if (headers.metaSchema) return 'meta-schema-header';
  return null;
};

const getRoutingHeaders = (req: Request): RoutingHeaders => ({
  apiName: req.get('X-Api-Name'),
  metaSchema: req.get('X-Meta-Schema'),
  databaseId: req.get('X-Database-Id')
});

const getUrlDomains = (req: Request): { domain: string; subdomains: string[] } => {
  const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  const parsed = parseUrl(fullUrl);
  return {
    domain: parsed.domain ?? '',
    subdomains: parsed.subdomains ?? []
  };
};

export const getSubdomain = (subdomains: string[]): string | null => {
  const filtered = subdomains.filter((name) => name !== 'www');
  return filtered.length ? filtered.join('.') : null;
};

export const getSvcKey = (opts: ApiOptions, req: Request): string => {
  const { domain, subdomains } = getUrlDomains(req);
  const baseKey = subdomains.filter((n) => n !== 'www').concat(domain).join('.');

  if (opts.api?.isPublic === false && req.internalTrusted === true) {
    const headers = getRoutingHeaders(req);
    const mode = getPrivateHeaderMode(headers);
    if (mode === 'api-name-header') {
      return `api:${headers.databaseId}:${headers.apiName}`;
    }
    if (mode === 'meta-schema-header') {
      return `metaschema:api:${headers.databaseId}`;
    }
  }
  return baseKey;
};

const toApiStructure = (row: ApiRow, opts: ApiOptions, settings: ResolvedModuleSettings = {}): ApiStructure => ({
  apiId: row.api_id,
  dbname: row.dbname || opts.pg?.database || '',
  anonRole: row.anon_role,
  roleName: row.role_name,
  schema: row.schemas,
  rlsModule: settings.rlsModule,
  domains: [],
  databaseId: row.database_id,
  isPublic: row.is_public,
  authSettings: settings.authSettings,
  corsOrigins: settings.corsOrigins,
  databaseSettings: settings.databaseSettings,
  pubkeyChallengeSettings: settings.pubkeyChallengeSettings,
  webauthnSettings: settings.webauthnSettings
});

const isExactApiRow = (row: ApiRow, requestedDatabaseId: string): boolean =>
  typeof row.api_id === 'string'
  && row.api_id.length > 0
  && row.database_id === requestedDatabaseId
  && typeof row.role_name === 'string'
  && row.role_name.length > 0
  && typeof row.anon_role === 'string'
  && row.anon_role.length > 0
  && typeof row.is_public === 'boolean'
  && Array.isArray(row.schemas)
  && row.schemas.length > 0
  && row.schemas.every(isValidPhysicalSchemaName)
  && new Set(row.schemas).size === row.schemas.length;

const createAdminStructure = (
  opts: ApiOptions,
  schemas: string[],
  databaseId?: string
): ApiStructure => ({
  dbname: opts.pg?.database ?? '',
  // Private header/meta-schema surfaces must be able to use a dedicated
  // non-BYPASSRLS execution role. Keep the legacy default for compatibility;
  // production admission will reject it unless operators configure safe roles.
  anonRole: opts.api?.anonRole ?? 'administrator',
  roleName: opts.api?.roleName ?? 'administrator',
  schema: schemas,
  domains: [],
  databaseId,
  isPublic: false
});

// =============================================================================
// Database Queries (API resolution only)
// =============================================================================

const validateSchemata = async (pool: Pool, schemas: string[]): Promise<string[]> => {
  const result = await pool.query(
    `SELECT schema_name FROM information_schema.schemata WHERE schema_name = ANY($1::text[])`,
    [schemas]
  );
  return result.rows.map((row: { schema_name: string }) => row.schema_name);
};

const queryByApiName = async (
  pool: Pool,
  opts: ApiOptions,
  databaseId: string,
  name: string
): Promise<ApiRow | null> => {
  const routingSchema = getRoutingSchema(opts);
  if (!isValidSchemaName(routingSchema)) {
    log.warn(`[api-name-lookup] invalid routing schema name: ${routingSchema}`);
    return null;
  }
  const result = await pool.query<ApiRow>(scopedApiNameLookupSql(routingSchema), [databaseId, name]);
  if (result.rows.length !== 1) {
    log.warn(
      `[api-name-lookup] expected one exact API row for databaseId=${databaseId}; `
        + `received ${result.rows.length}`
    );
    return null;
  }
  return result.rows[0];
};

// =============================================================================
// Resolution Logic
// =============================================================================

const determineMode = (ctx: ResolveContext): ResolutionMode => {
  const { opts, headers } = ctx;

  if (opts.api?.isPublic === false) {
    return getPrivateHeaderMode(headers) ?? 'scoped-route';
  }
  return 'scoped-route';
};

const resolveApiNameHeader = async (ctx: ResolveContext): Promise<ApiStructure | null> => {
  const { opts, pool, headers } = ctx;
  if (!headers.databaseId) return null;

  const row = await queryByApiName(pool, opts, headers.databaseId, headers.apiName!);
  
  if (!row || !isExactApiRow(row, headers.databaseId)) {
    log.debug(`[api-name-lookup] No API found for databaseId=${headers.databaseId} name=${headers.apiName}`);
    return null;
  }

  const loaderCtx = buildLoaderContext(
    pool,
    ctx.routingPoolIdentity,
    opts,
    row,
    ctx.leases
  );
  const settings = await resolveModuleSettings(ctx.registry, loaderCtx);
  log.debug(`[api-name-lookup] resolved schemas: [${row.schemas?.join(', ')}], rlsModule: ${settings.rlsModule ? 'found' : 'none'}, authSettings: ${settings.authSettings ? 'found' : 'none'}`);
  return toApiStructure(row, opts, settings);
};

const resolveMetaSchemaHeader = (
  ctx: ResolveContext,
  validatedSchemas: string[]
): ApiStructure => {
  return createAdminStructure(ctx.opts, validatedSchemas, ctx.headers.databaseId);
};

/**
 * Scoped routing plane resolution (host-only): one indexed resolve_route()
 * call against the compiled hostname/route bindings. Path/method routing
 * belongs to Traefik/Ingress — the server only maps host → tenant/api/db/role.
 * This is the sole host resolver. Returns null (→ 404) when disabled,
 * unmatched, the resolver is not installed, or the target is not an api
 * surface. There is no legacy fallback.
 */
const resolveScopedRoute = async (ctx: ResolveContext): Promise<ApiStructure | null> => {
  const { opts, pool, host } = ctx;

  const schema = getRoutingSchema(opts);
  const route = await resolveRoute(pool, schema, host);
  if (!route) return null;

  const structure = routeToApiStructure(route, opts);
  if (!structure) return null;

  log.debug(`[scoped-routing] resolved host=${host} → api=${structure.apiId} db=${structure.dbname}`);

  if (!structure.databaseId || !structure.apiId) return structure;

  const loaderCtx = buildLoaderContext(pool, ctx.routingPoolIdentity, opts, {
    api_id: structure.apiId,
    database_id: structure.databaseId,
    dbname: structure.dbname,
    role_name: structure.roleName,
    anon_role: structure.anonRole,
    is_public: structure.isPublic ?? false,
    schemas: structure.schema
  }, ctx.leases);
  const settings = await resolveModuleSettings(ctx.registry, loaderCtx);
  return {
    ...structure,
    rlsModule: settings.rlsModule,
    authSettings: settings.authSettings,
    corsOrigins: settings.corsOrigins,
    databaseSettings: settings.databaseSettings,
    pubkeyChallengeSettings: settings.pubkeyChallengeSettings,
    webauthnSettings: settings.webauthnSettings
  };
};

// =============================================================================
// Main Resolution Function
// =============================================================================

export const getApiConfig = async (
  opts: ApiOptions,
  req: Request,
  registry: LoaderRegistry = defaultRegistry
): Promise<ApiConfigResult> => {
  authorizeInternalRequest(opts, req);
  const { domain, subdomains } = getUrlDomains(req);
  const subdomain = getSubdomain(subdomains);
  const serviceKey = getSvcKey(opts, req);
  const cacheKey = getSvcCacheKey(opts, serviceKey);

  req.svc_key = serviceKey;
  req.svc_cache_key = cacheKey;

  // Hostname and private-selector routing is an authorization boundary. LISTEN
  // notifications are lossy across disconnects, so cached metadata cannot be
  // authoritative after a domain or API is reassigned. Resolve every request;
  // the independently keyed PostGraphile build cache still provides the large
  // memory and build-latency win once this exact contract is known.
  log.debug(`Authoritatively resolving API for key=${cacheKey}`);
  const leases: PgPoolLease[] = [];

  try {
    const routingLease = acquirePgPool(opts.pg, {
      purpose: 'routing-request-control',
      sanitizeOnCheckout: true
    });
    leases.push(routingLease);
    const pool = routingLease.pool;
    const ctx: ResolveContext = {
      opts,
      pool,
      routingPoolIdentity: routingLease.identity,
      leases,
      domain,
      subdomain,
      cacheKey,
      headers: getRoutingHeaders(req),
      host: req.get('host') || '',
      registry
    };

    // Validate schemas upfront for modes that need them
    const apiOpts = opts.api || {};
    const candidateSchemas = apiOpts.metaSchemas || [];

    const validatedSchemas = await validateSchemata(pool, candidateSchemas);

    if (validatedSchemas.length === 0) {
      const source = apiOpts.metaSchemas || [];
      const error = new Error(`No valid schemas found. Configured metaSchemas: [${source.join(', ')}]`) as Error & { code?: string };
      error.code = 'NO_VALID_SCHEMAS';
      throw error;
    }

    // Route to appropriate resolver based on mode
    const mode = determineMode(ctx);
    let result: ApiConfigResult;

    switch (mode) {
    case 'api-name-header':
      result = await resolveApiNameHeader(ctx);
      break;

    case 'meta-schema-header':
      result = resolveMetaSchemaHeader(ctx, validatedSchemas);
      break;

    case 'scoped-route':
      result = await resolveScopedRoute(ctx);
      break;
    }

    // Assert the complete routing identity before any downstream middleware.
    // Deliberately do not publish this result to svcCache; see above.
    if (result && !isApiError(result)) {
      assertDatabaseId(result);
    }

    return result;
  } finally {
    for (let i = leases.length - 1; i >= 0; i--) {
      leases[i].release();
    }
  }
};

// =============================================================================
// Express Middleware
// =============================================================================

export const createApiMiddleware = (
  opts: ApiOptions,
  registry: LoaderRegistry = defaultRegistry
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    log.debug(`[api-middleware] ${req.method} ${req.path}`);

    try {
      const apiConfig = await getApiConfig(opts, req, registry);

      if (isApiError(apiConfig)) {
        res.status(404).send(errorPage404Message('API not found', apiConfig.errorHtml));
        return;
      }

      if (!apiConfig) {
        res.status(404).send(errorPage404Message('API service not found for the given domain/subdomain.'));
        return;
      }

      req.api = apiConfig;
      req.databaseId = apiConfig.databaseId;
      log.debug(`Resolved API: db=${apiConfig.dbname}, schemas=[${apiConfig.schema?.join(', ')}]`);
      next();
    } catch (error: unknown) {
      const err = error as Error & { code?: string };

      if (err.code === 'INTERNAL_REQUEST_FORBIDDEN') {
        res.status(403).send('Forbidden');
        return;
      }

      if (err.code === 'NO_VALID_SCHEMAS') {
        res.status(404).send(errorPage404Message(err.message));
        return;
      }

      if (err.code === 'NO_DATABASE_ID') {
        log.error('[api-middleware] no database id resolved:', err.message);
        res.status(500).send(errorPage50x);
        return;
      }

      if (err.code === PG_POOL_CAPACITY_ERROR_CODE) {
        next(err);
        return;
      }

      if (err.message?.includes('does not exist')) {
        res.status(404).send(errorPage404Message("The resource you're looking for does not exist."));
        return;
      }

      log.error('API middleware error:', err);
      res.status(500).send(errorPage50x);
    }
  };
};
