import { getNodeEnv } from '@constructive-io/graphql-env';
import { Logger } from '@pgpmjs/logger';
import { svcCache } from '@pgpmjs/server-utils';
import { parseUrl } from '@constructive-io/url-domains';
import { NextFunction, Request, Response } from 'express';
import { Pool } from 'pg';
import { getPgPool } from 'pg-cache';

import {
  DomainNotFoundError,
  ApiNotFoundError,
  NoValidSchemasError,
} from '../errors/api-errors';
import { ApiConfigResult, ApiError, ApiOptions, ApiStructure } from '../types';
import './types'; // for Request type

const log = new Logger('api');
const isDev = () => getNodeEnv() === 'development';

const isApiError = (svc: ApiConfigResult): svc is ApiError =>
  !!svc && typeof (svc as ApiError).errorHtml === 'string';

const parseCommaSeparatedHeader = (value: string): string[] =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

const getUrlDomains = (
  req: Request
): { domain: string; subdomains: string[] } => {
  const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  const parsed = parseUrl(fullUrl);
  return {
    domain: parsed.domain ?? '',
    subdomains: parsed.subdomains ?? [],
  };
};

export const getSubdomain = (reqDomains: string[]): string | null => {
  const names = reqDomains.filter((name) => !['www'].includes(name));
  return !names.length ? null : names.join('.');
};

export const createApiMiddleware = (opts: ApiOptions) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // Log incoming request details at debug level to avoid excessive info logs in production
    log.debug(`[api-middleware] Request: ${req.method} ${req.path}`);
    log.debug(`[api-middleware] Headers: X-Api-Name=${req.get('X-Api-Name')}, X-Database-Id=${req.get('X-Database-Id')}, X-Meta-Schema=${req.get('X-Meta-Schema')}, Host=${req.get('Host')}`);

    if (opts.api?.enableServicesApi === false) {
      const schemas = opts.api.exposedSchemas ?? [];
      const anonRole = opts.api.anonRole ?? '';
      const roleName = opts.api.roleName ?? '';
      const databaseId = opts.api.defaultDatabaseId;
      const api: ApiStructure = {
        dbname: opts.pg?.database ?? '',
        anonRole,
        roleName,
        schema: schemas,
        apiModules: [],
        domains: [],
        databaseId,
        isPublic: false,
      };
      req.api = api;
      req.databaseId = databaseId;
      req.svc_key = 'meta-api-off';
      return next();
    }
    // Get the service key for error context
    const key = getSvcKey(opts, req);

    try {
      const apiConfig = await getApiConfig(opts, req);

      if (isApiError(apiConfig)) {
        // ApiError from getApiConfig contains errorHtml - throw ApiNotFoundError
        throw new ApiNotFoundError(apiConfig.errorHtml || 'unknown');
      } else if (!apiConfig) {
        const { domain, subdomains } = getUrlDomains(req);
        const subdomain = getSubdomain(subdomains);
        throw new DomainNotFoundError(domain, subdomain);
      }
      req.api = apiConfig;
      req.databaseId = apiConfig.databaseId;
      if (isDev())
        log.debug(
          `Resolved API: db=${apiConfig.dbname}, schemas=[${apiConfig.schema?.join(', ')}]`
        );
      next();
    } catch (error: unknown) {
      const err = error as Error & { code?: string };
      if (err.code === 'NO_VALID_SCHEMAS') {
        // Convert internal NO_VALID_SCHEMAS error to typed error
        throw new NoValidSchemasError(key);
      } else if (err.message?.match(/does not exist/)) {
        // Resource not found - throw DomainNotFoundError
        const { domain, subdomains } = getUrlDomains(req);
        const subdomain = getSubdomain(subdomains);
        throw new DomainNotFoundError(domain, subdomain);
      } else {
        // Re-throw unknown errors for the error handler to process
        log.error('API middleware error:', err);
        throw err;
      }
    }
  };
};

const createAdminApiStructure = ({
  opts,
  schemata,
  key,
  databaseId,
}: {
  opts: ApiOptions;
  schemata: string[];
  key: string;
  databaseId?: string;
}): ApiStructure => {
  const api: ApiStructure = {
    dbname: opts.pg?.database ?? '',
    anonRole: 'administrator',
    roleName: 'administrator',
    schema: schemata,
    apiModules: [],
    domains: [],
    databaseId,
    isPublic: false,
  };
  svcCache.set(key, api);
  return api;
};

/**
 * Query API by domain and subdomain using direct SQL
 * 
 * TODO: This is a simplified v5 implementation that uses direct SQL queries
 * instead of the v4 graphile-query. Once graphile-query is ported to v5,
 * we can restore the GraphQL-based lookup.
 */
const queryServiceByDomainAndSubdomain = async ({
  opts,
  key,
  pool,
  domain,
  subdomain,
}: {
  opts: ApiOptions;
  key: string;
  pool: Pool;
  domain: string;
  subdomain: string | null;
}): Promise<ApiStructure | null> => {
  const apiPublic = opts.api?.isPublic;
  
  try {
    const query = `
      SELECT 
        a.id,
        a.name,
        a.database_id,
        a.is_public,
        a.anon_role,
        a.role_name,
        d.database_name as dbname,
        COALESCE(
          (SELECT array_agg(s.schema_name) 
           FROM services_public.api_schemas s 
           WHERE s.api_id = a.id),
          ARRAY[]::text[]
        ) as schemas
      FROM services_public.domains dom
      JOIN services_public.apis a ON a.id = dom.api_id
      LEFT JOIN services_public.databases d ON d.id = a.database_id
      WHERE dom.domain = $1 
        AND ($2::text IS NULL AND dom.subdomain IS NULL OR dom.subdomain = $2)
        AND a.is_public = $3
    `;
    
    const result = await pool.query(query, [domain, subdomain, apiPublic]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    const apiStructure: ApiStructure = {
      dbname: row.dbname || opts.pg?.database || '',
      anonRole: row.anon_role || 'anon',
      roleName: row.role_name || 'authenticated',
      schema: row.schemas || [],
      apiModules: [],
      domains: [],
      databaseId: row.database_id,
      isPublic: row.is_public,
    };
    
    svcCache.set(key, apiStructure);
    return apiStructure;
  } catch (err: any) {
    if (err.message?.includes('does not exist')) {
      log.debug(`services_public schema not found, skipping domain lookup`);
      return null;
    }
    throw err;
  }
};

/**
 * Query API by name using direct SQL
 */
export const queryServiceByApiName = async ({
  opts,
  key,
  pool,
  databaseId,
  name,
}: {
  opts: ApiOptions;
  key: string;
  pool: Pool;
  databaseId?: string;
  name: string;
}): Promise<ApiStructure | null> => {
  if (!databaseId) return null;
  const apiPublic = opts.api?.isPublic;
  
  try {
    const query = `
      SELECT 
        a.id,
        a.name,
        a.database_id,
        a.is_public,
        a.anon_role,
        a.role_name,
        d.database_name as dbname,
        COALESCE(
          (SELECT array_agg(s.schema_name) 
           FROM services_public.api_schemas s 
           WHERE s.api_id = a.id),
          ARRAY[]::text[]
        ) as schemas
      FROM services_public.apis a
      LEFT JOIN services_public.databases d ON d.id = a.database_id
      WHERE a.database_id = $1 
        AND a.name = $2
        AND a.is_public = $3
    `;
    
    const result = await pool.query(query, [databaseId, name, apiPublic]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    const apiStructure: ApiStructure = {
      dbname: row.dbname || opts.pg?.database || '',
      anonRole: row.anon_role || 'anon',
      roleName: row.role_name || 'authenticated',
      schema: row.schemas || [],
      apiModules: [],
      domains: [],
      databaseId: row.database_id,
      isPublic: row.is_public,
    };
    
    svcCache.set(key, apiStructure);
    return apiStructure;
  } catch (err: any) {
    if (err.message?.includes('does not exist')) {
      log.debug(`services_public schema not found, skipping API name lookup`);
      return null;
    }
    throw err;
  }
};

export const getSvcKey = (opts: ApiOptions, req: Request): string => {
  const { domain, subdomains } = getUrlDomains(req);
  const key = subdomains
    .filter((name: string) => !['www'].includes(name))
    .concat(domain)
    .join('.');

  const apiPublic = opts.api?.isPublic;
  if (apiPublic === false) {
    if (req.get('X-Api-Name')) {
      return 'api:' + req.get('X-Database-Id') + ':' + req.get('X-Api-Name');
    }
    if (req.get('X-Schemata')) {
      return (
        'schemata:' + req.get('X-Database-Id') + ':' + req.get('X-Schemata')
      );
    }
    if (req.get('X-Meta-Schema')) {
      return 'metaschema:api:' + req.get('X-Database-Id');
    }
  }
  return key;
};

const validateSchemata = async (
  pool: Pool,
  schemata: string[]
): Promise<string[]> => {
  const result = await pool.query(
    `SELECT schema_name FROM information_schema.schemata WHERE schema_name = ANY($1::text[])`,
    [schemata]
  );
  return result.rows.map((row: { schema_name: string }) => row.schema_name);
};

export const getApiConfig = async (
  opts: ApiOptions,
  req: Request
): Promise<ApiConfigResult> => {
  const rootPgPool = getPgPool(opts.pg);
  const { domain, subdomains } = getUrlDomains(req);
  const subdomain = getSubdomain(subdomains);

  const key = getSvcKey(opts, req);
  req.svc_key = key;

  let apiConfig: ApiConfigResult;
  if (svcCache.has(key)) {
    if (isDev()) log.debug(`Cache HIT for key=${key}`);
    apiConfig = svcCache.get(key) as ApiStructure;
  } else {
    if (isDev()) log.debug(`Cache MISS for key=${key}, looking up API`);
    const apiOpts = opts.api || {};
    const apiPublic = apiOpts.isPublic;
    const schemataHeader = req.get('X-Schemata');
    const apiNameHeader = req.get('X-Api-Name');
    const metaSchemaHeader = req.get('X-Meta-Schema');
    const databaseIdHeader = req.get('X-Database-Id');
    const headerSchemata = schemataHeader
      ? parseCommaSeparatedHeader(schemataHeader)
      : [];
    const candidateSchemata =
      apiPublic === false && headerSchemata.length
        ? Array.from(
            new Set([...(apiOpts.metaSchemas || []), ...headerSchemata])
          )
        : apiOpts.metaSchemas || [];
    const validatedSchemata = await validateSchemata(
      rootPgPool,
      candidateSchemata
    );

    if (validatedSchemata.length === 0) {
      const schemaSource = headerSchemata.length
        ? headerSchemata
        : apiOpts.metaSchemas || [];
      const label = headerSchemata.length ? 'X-Schemata' : 'metaSchemas';
      const message = `No valid schemas found. Configured ${label}: [${schemaSource.join(', ')}]`;
      if (isDev()) log.debug(message);
      const error = new Error(message) as Error & { code?: string };
      error.code = 'NO_VALID_SCHEMAS';
      throw error;
    }

    const validSchemaSet = new Set(validatedSchemata);
    const validatedHeaderSchemata = headerSchemata.filter((schemaName) =>
      validSchemaSet.has(schemaName)
    );

    if (apiPublic === false) {
      if (schemataHeader) {
        if (validatedHeaderSchemata.length === 0) {
          return {
            errorHtml:
              'No valid schemas found for the supplied X-Schemata header.',
          };
        }
        apiConfig = createAdminApiStructure({
          opts,
          schemata: validatedHeaderSchemata,
          key,
          databaseId: databaseIdHeader,
        });
      } else if (apiNameHeader) {
        apiConfig = await queryServiceByApiName({
          opts,
          key,
          pool: rootPgPool,
          name: apiNameHeader,
          databaseId: databaseIdHeader,
        });
      } else if (metaSchemaHeader) {
        apiConfig = createAdminApiStructure({
          opts,
          schemata: validatedSchemata,
          key,
          databaseId: databaseIdHeader,
        });
      } else {
        apiConfig = await queryServiceByDomainAndSubdomain({
          opts,
          key,
          pool: rootPgPool,
          domain,
          subdomain,
        });
      }
    } else {
      apiConfig = await queryServiceByDomainAndSubdomain({
        opts,
        key,
        pool: rootPgPool,
        domain,
        subdomain,
      });
    }
  }
  return apiConfig;
};
