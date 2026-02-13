import { getNodeEnv } from '@constructive-io/graphql-env';
import { Logger } from '@pgpmjs/logger';
import { svcCache } from '@pgpmjs/server-utils';
import { parseUrl } from '@constructive-io/url-domains';
import { NextFunction, Request, Response } from 'express';
import { Pool } from 'pg';
import { getPgPool } from 'pg-cache';

import errorPage50x from '../errors/50x';
import errorPage404Message from '../errors/404-message';
import { ApiConfigResult, ApiError, ApiOptions, ApiStructure, RlsModule } from '../types';
import './types';

const log = new Logger('api');
const isDev = () => getNodeEnv() === 'development';

// =============================================================================
// SQL Queries
// =============================================================================

const DOMAIN_LOOKUP_SQL = `
  SELECT 
    a.id as api_id,
    a.database_id,
    a.dbname,
    a.role_name,
    a.anon_role,
    a.is_public,
    COALESCE(array_agg(s.schema_name) FILTER (WHERE s.schema_name IS NOT NULL), '{}') as schemas
  FROM services_public.domains d
  JOIN services_public.apis a ON d.api_id = a.id
  LEFT JOIN services_public.api_schemas aps ON a.id = aps.api_id
  LEFT JOIN metaschema_public.schema s ON aps.schema_id = s.id
  WHERE d.domain = $1 
    AND (($2::text IS NULL AND d.subdomain IS NULL) OR d.subdomain = $2)
    AND a.is_public = $3
  GROUP BY a.id, a.database_id, a.dbname, a.role_name, a.anon_role, a.is_public
  LIMIT 1
`;

const API_NAME_LOOKUP_SQL = `
  SELECT 
    a.id as api_id,
    a.database_id,
    a.dbname,
    a.role_name,
    a.anon_role,
    a.is_public,
    COALESCE(array_agg(s.schema_name) FILTER (WHERE s.schema_name IS NOT NULL), '{}') as schemas
  FROM services_public.apis a
  LEFT JOIN services_public.api_schemas aps ON a.id = aps.api_id
  LEFT JOIN metaschema_public.schema s ON aps.schema_id = s.id
  WHERE a.database_id = $1 
    AND a.name = $2
    AND a.is_public = $3
  GROUP BY a.id, a.database_id, a.dbname, a.role_name, a.anon_role, a.is_public
  LIMIT 1
`;

const API_LIST_SQL = `
  SELECT 
    a.id,
    a.database_id,
    a.name,
    a.dbname,
    a.role_name,
    a.anon_role,
    a.is_public,
    COALESCE(
      json_agg(
        json_build_object('domain', d.domain, 'subdomain', d.subdomain)
      ) FILTER (WHERE d.domain IS NOT NULL),
      '[]'
    ) as domains
  FROM services_public.apis a
  LEFT JOIN services_public.domains d ON a.id = d.api_id
  WHERE a.is_public = $1
  GROUP BY a.id, a.database_id, a.name, a.dbname, a.role_name, a.anon_role, a.is_public
  LIMIT 100
`;

const RLS_MODULE_SQL = `
  SELECT 
    rm.authenticate,
    rm.authenticate_strict,
    ps.schema_name as private_schema_name
  FROM metaschema_modules_public.rls_module rm
  LEFT JOIN metaschema_public.schema ps ON rm.private_schema_id = ps.id
  WHERE rm.api_id = $1
  LIMIT 1
`;

// =============================================================================
// Types
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

interface RlsModuleRow {
  authenticate: string | null;
  authenticate_strict: string | null;
  private_schema_name: string | null;
}

interface ApiListRow {
  id: string;
  database_id: string;
  name: string;
  dbname: string;
  role_name: string;
  anon_role: string;
  is_public: boolean;
  domains: Array<{ domain: string; subdomain: string | null }>;
}

interface ResolveContext {
  opts: ApiOptions;
  pool: Pool;
  domain: string;
  subdomain: string | null;
  cacheKey: string;
  headers: {
    schemata?: string;
    apiName?: string;
    metaSchema?: string;
    databaseId?: string;
  };
}

type ResolutionMode = 
  | 'services-disabled'
  | 'schemata-header'
  | 'api-name-header'
  | 'meta-schema-header'
  | 'domain-lookup';

// =============================================================================
// Helpers
// =============================================================================

const isApiError = (result: ApiConfigResult): result is ApiError =>
  !!result && typeof (result as ApiError).errorHtml === 'string';

const parseCommaSeparatedHeader = (value: string): string[] =>
  value.split(',').map((s) => s.trim()).filter(Boolean);

const getUrlDomains = (req: Request): { domain: string; subdomains: string[] } => {
  const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  const parsed = parseUrl(fullUrl);
  return {
    domain: parsed.domain ?? '',
    subdomains: parsed.subdomains ?? [],
  };
};

export const getSubdomain = (subdomains: string[]): string | null => {
  const filtered = subdomains.filter((name) => name !== 'www');
  return filtered.length ? filtered.join('.') : null;
};

export const getSvcKey = (opts: ApiOptions, req: Request): string => {
  const { domain, subdomains } = getUrlDomains(req);
  const baseKey = subdomains.filter((n) => n !== 'www').concat(domain).join('.');

  if (opts.api?.isPublic === false) {
    if (req.get('X-Api-Name')) {
      return `api:${req.get('X-Database-Id')}:${req.get('X-Api-Name')}`;
    }
    if (req.get('X-Schemata')) {
      return `schemata:${req.get('X-Database-Id')}:${req.get('X-Schemata')}`;
    }
    if (req.get('X-Meta-Schema')) {
      return `metaschema:api:${req.get('X-Database-Id')}`;
    }
  }
  return baseKey;
};

const toRlsModule = (row: RlsModuleRow | null): RlsModule | undefined => {
  if (!row || !row.private_schema_name) return undefined;
  return {
    authenticate: row.authenticate ?? undefined,
    authenticateStrict: row.authenticate_strict ?? undefined,
    privateSchema: {
      schemaName: row.private_schema_name,
    },
  };
};

const toApiStructure = (row: ApiRow, opts: ApiOptions, rlsModuleRow?: RlsModuleRow | null): ApiStructure => ({
  dbname: row.dbname || opts.pg?.database || '',
  anonRole: row.anon_role || 'anon',
  roleName: row.role_name || 'authenticated',
  schema: row.schemas || [],
  apiModules: [],
  rlsModule: toRlsModule(rlsModuleRow ?? null),
  domains: [],
  databaseId: row.database_id,
  isPublic: row.is_public,
});

const createAdminStructure = (
  opts: ApiOptions,
  schemas: string[],
  databaseId?: string
): ApiStructure => ({
  dbname: opts.pg?.database ?? '',
  anonRole: 'administrator',
  roleName: 'administrator',
  schema: schemas,
  apiModules: [],
  domains: [],
  databaseId,
  isPublic: false,
});

// =============================================================================
// Database Queries
// =============================================================================

const validateSchemata = async (pool: Pool, schemas: string[]): Promise<string[]> => {
  const result = await pool.query(
    `SELECT schema_name FROM information_schema.schemata WHERE schema_name = ANY($1::text[])`,
    [schemas]
  );
  return result.rows.map((row: { schema_name: string }) => row.schema_name);
};

const queryByDomain = async (
  pool: Pool,
  domain: string,
  subdomain: string | null,
  isPublic: boolean
): Promise<ApiRow | null> => {
  const result = await pool.query<ApiRow>(DOMAIN_LOOKUP_SQL, [domain, subdomain, isPublic]);
  return result.rows[0] ?? null;
};

const queryByApiName = async (
  pool: Pool,
  databaseId: string,
  name: string,
  isPublic: boolean
): Promise<ApiRow | null> => {
  const result = await pool.query<ApiRow>(API_NAME_LOOKUP_SQL, [databaseId, name, isPublic]);
  return result.rows[0] ?? null;
};

const queryApiList = async (pool: Pool, isPublic: boolean): Promise<ApiListRow[]> => {
  const result = await pool.query<ApiListRow>(API_LIST_SQL, [isPublic]);
  return result.rows;
};

const queryRlsModule = async (pool: Pool, apiId: string): Promise<RlsModuleRow | null> => {
  const result = await pool.query<RlsModuleRow>(RLS_MODULE_SQL, [apiId]);
  return result.rows[0] ?? null;
};

// =============================================================================
// Resolution Logic
// =============================================================================

const determineMode = (ctx: ResolveContext): ResolutionMode => {
  const { opts, headers } = ctx;
  
  if (opts.api?.enableServicesApi === false) return 'services-disabled';
  if (opts.api?.isPublic === false) {
    if (headers.schemata) return 'schemata-header';
    if (headers.apiName) return 'api-name-header';
    if (headers.metaSchema) return 'meta-schema-header';
  }
  return 'domain-lookup';
};

const resolveServicesDisabled = (ctx: ResolveContext): ApiStructure => {
  const { opts } = ctx;
  return {
    dbname: opts.pg?.database ?? '',
    anonRole: opts.api?.anonRole ?? '',
    roleName: opts.api?.roleName ?? '',
    schema: opts.api?.exposedSchemas ?? [],
    apiModules: [],
    domains: [],
    databaseId: opts.api?.defaultDatabaseId,
    isPublic: false,
  };
};

const resolveSchemataHeader = async (
  ctx: ResolveContext,
  validatedSchemas: string[]
): Promise<ApiConfigResult> => {
  const { opts, headers } = ctx;
  const headerSchemas = parseCommaSeparatedHeader(headers.schemata!);
  const validSet = new Set(validatedSchemas);
  const validHeaderSchemas = headerSchemas.filter((s) => validSet.has(s));

  if (validHeaderSchemas.length === 0) {
    return { errorHtml: 'No valid schemas found for the supplied X-Schemata header.' };
  }

  return createAdminStructure(opts, validHeaderSchemas, headers.databaseId);
};

const resolveApiNameHeader = async (ctx: ResolveContext): Promise<ApiStructure | null> => {
  const { opts, pool, headers } = ctx;
  if (!headers.databaseId) return null;

  const isPublic = opts.api?.isPublic ?? false;
  const row = await queryByApiName(pool, headers.databaseId, headers.apiName!, isPublic);
  
  if (!row) {
    log.debug(`[api-name-lookup] No API found for databaseId=${headers.databaseId} name=${headers.apiName}`);
    return null;
  }

  const rlsModule = await queryRlsModule(pool, row.api_id);
  log.debug(`[api-name-lookup] resolved schemas: [${row.schemas?.join(', ')}], rlsModule: ${rlsModule ? 'found' : 'none'}`);
  return toApiStructure(row, opts, rlsModule);
};

const resolveMetaSchemaHeader = (
  ctx: ResolveContext,
  validatedSchemas: string[]
): ApiStructure => {
  return createAdminStructure(ctx.opts, validatedSchemas, ctx.headers.databaseId);
};

const resolveDomainLookup = async (ctx: ResolveContext): Promise<ApiStructure | null> => {
  const { opts, pool, domain, subdomain } = ctx;
  const isPublic = opts.api?.isPublic ?? false;

  log.debug(`[domain-lookup] domain=${domain} subdomain=${subdomain} isPublic=${isPublic}`);
  
  const row = await queryByDomain(pool, domain, subdomain, isPublic);
  
  if (!row) {
    log.debug(`[domain-lookup] No API found for domain=${domain} subdomain=${subdomain}`);
    return null;
  }

  const rlsModule = await queryRlsModule(pool, row.api_id);
  log.debug(`[domain-lookup] resolved schemas: [${row.schemas?.join(', ')}], rlsModule: ${rlsModule ? 'found' : 'none'}`);
  return toApiStructure(row, opts, rlsModule);
};

const buildDevFallbackError = async (
  ctx: ResolveContext,
  req: Request
): Promise<ApiError | null> => {
  if (getNodeEnv() !== 'development') return null;

  const isPublic = ctx.opts.api?.isPublic ?? false;
  const apis = await queryApiList(ctx.pool, isPublic);
  if (!apis.length) return null;

  const host = req.get('host') || '';
  const portMatch = host.match(/:(\d+)$/);
  const port = portMatch ? portMatch[1] : '';

  const apiCards = apis.map((api) => {
    const domains = api.domains.length
      ? api.domains.map((d) => {
          const hostname = d.subdomain ? `${d.subdomain}.${d.domain}` : d.domain;
          const url = port ? `http://${hostname}:${port}/graphiql` : `http://${hostname}/graphiql`;
          return `<a href="${url}" style="color:#01A1FF;text-decoration:none;font-weight:500" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${hostname}</a>`;
        }).join('<span style="color:#D4DCEA;margin:0 4px">·</span>')
      : '<span style="color:#8E9398;font-style:italic;font-size:11px">no domains</span>';

    const badge = api.is_public
      ? '<span style="color:#01A1FF;font-size:10px;font-weight:500">public</span>'
      : '<span style="color:#8E9398;font-size:10px">private</span>';

    return `
      <div style="background:#fff;border-radius:8px;padding:10px 14px;margin-bottom:6px;box-shadow:0 1px 3px rgba(0,0,0,0.04);border:1px solid #E8ECF0;display:flex;align-items:center;gap:12px;transition:background 0.15s" onmouseover="this.style.background='#FAFBFC'" onmouseout="this.style.background='#fff'">
        <div style="flex:1;min-width:0;display:flex;align-items:center;gap:8px;font-size:13px">
          <span style="font-weight:600;color:#232323;white-space:nowrap">${api.name}</span>
          <span style="color:#D4DCEA">→</span>
          ${domains}
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
          <span style="color:#8E9398;font-size:11px;font-family:'SF Mono',Monaco,monospace">${api.dbname}</span>
          ${badge}
        </div>
      </div>`;
  }).join('');

  return {
    errorHtml: `
      <div style="text-align:left;max-width:600px;margin:0 auto">
        <p style="color:#8E9398;font-size:11px;margin-bottom:10px;font-weight:500;text-transform:uppercase;letter-spacing:0.5px">Available APIs</p>
        ${apiCards}
      </div>`,
  };
};

// =============================================================================
// Main Resolution Function
// =============================================================================

export const getApiConfig = async (
  opts: ApiOptions,
  req: Request
): Promise<ApiConfigResult> => {
  const pool = getPgPool(opts.pg);
  const { domain, subdomains } = getUrlDomains(req);
  const subdomain = getSubdomain(subdomains);
  const cacheKey = getSvcKey(opts, req);

  req.svc_key = cacheKey;

  // Check cache first
  if (svcCache.has(cacheKey)) {
    log.debug(`Cache HIT for key=${cacheKey}`);
    return svcCache.get(cacheKey) as ApiStructure;
  }

  log.debug(`Cache MISS for key=${cacheKey}, resolving API`);

  const ctx: ResolveContext = {
    opts,
    pool,
    domain,
    subdomain,
    cacheKey,
    headers: {
      schemata: req.get('X-Schemata'),
      apiName: req.get('X-Api-Name'),
      metaSchema: req.get('X-Meta-Schema'),
      databaseId: req.get('X-Database-Id'),
    },
  };

  // Validate schemas upfront for modes that need them
  const apiOpts = opts.api || {};
  const headerSchemas = ctx.headers.schemata ? parseCommaSeparatedHeader(ctx.headers.schemata) : [];
  const candidateSchemas =
    apiOpts.isPublic === false && headerSchemas.length
      ? [...new Set([...(apiOpts.metaSchemas || []), ...headerSchemas])]
      : apiOpts.metaSchemas || [];
  
  const validatedSchemas = await validateSchemata(pool, candidateSchemas);

  if (validatedSchemas.length === 0) {
    const source = headerSchemas.length ? headerSchemas : apiOpts.metaSchemas || [];
    const label = headerSchemas.length ? 'X-Schemata' : 'metaSchemas';
    const error = new Error(`No valid schemas found. Configured ${label}: [${source.join(', ')}]`) as Error & { code?: string };
    error.code = 'NO_VALID_SCHEMAS';
    throw error;
  }

  // Route to appropriate resolver based on mode
  const mode = determineMode(ctx);
  let result: ApiConfigResult;

  switch (mode) {
    case 'services-disabled':
      result = resolveServicesDisabled(ctx);
      break;

    case 'schemata-header':
      result = await resolveSchemataHeader(ctx, validatedSchemas);
      break;

    case 'api-name-header':
      result = await resolveApiNameHeader(ctx);
      break;

    case 'meta-schema-header':
      result = resolveMetaSchemaHeader(ctx, validatedSchemas);
      break;

    case 'domain-lookup':
      result = await resolveDomainLookup(ctx);
      if (!result && apiOpts.isPublic) {
        const fallback = await buildDevFallbackError(ctx, req);
        if (fallback) return fallback;
      }
      break;
  }

  // Cache successful results
  if (result && !isApiError(result)) {
    svcCache.set(cacheKey, result);
  }

  return result;
};

// =============================================================================
// Express Middleware
// =============================================================================

export const createApiMiddleware = (opts: ApiOptions) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    log.debug(`[api-middleware] ${req.method} ${req.path}`);

    // Fast path: services disabled
    if (opts.api?.enableServicesApi === false) {
      req.api = resolveServicesDisabled({
        opts,
        pool: null as unknown as Pool,
        domain: '',
        subdomain: null,
        cacheKey: 'meta-api-off',
        headers: {},
      });
      req.databaseId = req.api.databaseId;
      req.svc_key = 'meta-api-off';
      return next();
    }

    try {
      const apiConfig = await getApiConfig(opts, req);

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

      if (err.code === 'NO_VALID_SCHEMAS') {
        res.status(404).send(errorPage404Message(err.message));
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
