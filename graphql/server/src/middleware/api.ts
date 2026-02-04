import { getNodeEnv } from '@constructive-io/graphql-env';
import { Logger } from '@pgpmjs/logger';
import { svcCache } from '@pgpmjs/server-utils';
import { parseUrl } from '@constructive-io/url-domains';
import { NextFunction, Request, Response } from 'express';
import { Pool } from 'pg';
import { getPgPool } from 'pg-cache';

import errorPage50x from '../errors/50x';
import errorPage404Message from '../errors/404-message';
import { ApiConfigResult, ApiError, ApiOptions, ApiStructure } from '../types';
import './types';

const log = new Logger('api');
const isDev = () => getNodeEnv() === 'development';

// =============================================================================
// SQL Queries
// =============================================================================

const DOMAIN_LOOKUP_SQL = `
  SELECT 
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

// =============================================================================
// Types
// =============================================================================

interface ApiRow {
  database_id: string;
  dbname: string;
  role_name: string;
  anon_role: string;
  is_public: boolean;
  schemas: string[];
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

const toApiStructure = (row: ApiRow, opts: ApiOptions): ApiStructure => ({
  dbname: row.dbname || opts.pg?.database || '',
  anonRole: row.anon_role || 'anon',
  roleName: row.role_name || 'authenticated',
  schema: row.schemas || [],
  apiModules: [],
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
  try {
    const result = await pool.query<ApiRow>(DOMAIN_LOOKUP_SQL, [domain, subdomain, isPublic]);
    return result.rows[0] ?? null;
  } catch (err: unknown) {
    if ((err as Error).message?.includes('does not exist')) return null;
    throw err;
  }
};

const queryByApiName = async (
  pool: Pool,
  databaseId: string,
  name: string,
  isPublic: boolean
): Promise<ApiRow | null> => {
  try {
    const result = await pool.query<ApiRow>(API_NAME_LOOKUP_SQL, [databaseId, name, isPublic]);
    return result.rows[0] ?? null;
  } catch (err: unknown) {
    if ((err as Error).message?.includes('does not exist')) return null;
    throw err;
  }
};

const queryApiList = async (pool: Pool, isPublic: boolean): Promise<ApiListRow[]> => {
  try {
    const result = await pool.query<ApiListRow>(API_LIST_SQL, [isPublic]);
    return result.rows;
  } catch (err: unknown) {
    if ((err as Error).message?.includes('does not exist')) return [];
    throw err;
  }
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

  log.debug(`[api-name-lookup] resolved schemas: [${row.schemas?.join(', ')}]`);
  return toApiStructure(row, opts);
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

  log.debug(`[domain-lookup] resolved schemas: [${row.schemas?.join(', ')}]`);
  return toApiStructure(row, opts);
};

const buildDevFallbackError = async (
  ctx: ResolveContext
): Promise<ApiError | null> => {
  if (getNodeEnv() !== 'development') return null;

  const isPublic = ctx.opts.api?.isPublic ?? false;
  const apis = await queryApiList(ctx.pool, isPublic);
  if (!apis.length) return null;

  const apiCards = apis.map((api) => {
    const domainList = api.domains.length
      ? api.domains.map((d) => {
          const host = d.subdomain ? `${d.subdomain}.${d.domain}` : d.domain;
          return `<li class="font-mono text-sm text-brand">${host}</li>`;
        }).join('')
      : '<li class="text-gray-400 italic">No domains configured</li>';

    return `
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div class="flex items-center justify-between mb-2">
          <span class="font-semibold text-gray-800">${api.name}</span>
          <span class="text-xs px-2 py-0.5 rounded ${api.is_public ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}">
            ${api.is_public ? 'public' : 'private'}
          </span>
        </div>
        <p class="text-xs text-gray-500 mb-3">db: ${api.dbname}</p>
        <ul class="space-y-1">${domainList}</ul>
      </div>`;
  }).join('');

  return {
    errorHtml: `
      <div class="text-left max-w-md mx-auto">
        <p class="text-sm text-gray-600 mb-4">Available APIs:</p>
        <div class="space-y-3">${apiCards}</div>
        <p class="text-xs text-gray-400 mt-4">
          Add domains to /etc/hosts pointing to 127.0.0.1
        </p>
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
        const fallback = await buildDevFallbackError(ctx);
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
