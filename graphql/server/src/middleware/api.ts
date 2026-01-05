import { getNodeEnv } from '@constructive-io/graphql-env';
import { Logger } from '@pgpmjs/logger';
import { svcCache } from '@pgpmjs/server-utils';
import { PgpmOptions } from '@pgpmjs/types';
import { NextFunction, Request, Response } from 'express';
import { getSchema, GraphileQuery } from 'graphile-query';
import { getGraphileSettings } from 'graphile-settings';
import { Pool } from 'pg';
import { getPgPool } from 'pg-cache';

import errorPage50x from '../errors/50x';
import errorPage404Message from '../errors/404-message';
import { ApiStructure, Domain, SchemaNode, Service, Site } from '../types';
import { ApiByNameQuery, ApiQuery, ListOfAllDomainsOfDb } from './gql';
import { createRequestScopedLogger, getRequestId } from './request-logger';
import './types';

// ============================================================================
// Logger Setup
// ============================================================================

const log = createRequestScopedLogger('api');
const queryLog = new Logger('api');
const isDev = () => getNodeEnv() === 'development';

const debugLog = (prefix: string, message: string): void => {
  if (isDev()) queryLog.debug(`${prefix} ${message}`);
};

// ============================================================================
// Types
// ============================================================================

interface ApiOptions {
  metaSchemas?: string[];
  isPublic?: boolean;
  exposedSchemas?: string[];
  anonRole?: string;
  roleName?: string;
  defaultDatabaseId?: string;
  enableMetaApi?: boolean;
}

interface ServiceData {
  data: { api: any };
  errorHtml?: string;
}

// ============================================================================
// Utility Functions
// ============================================================================

const getApiOptions = (opts: PgpmOptions): ApiOptions =>
  (opts as any).api || {};

export const getSubdomain = (subdomains: string[]): string | null => {
  const filtered = subdomains.filter((name) => name !== 'www');
  return filtered.length ? filtered.join('.') : null;
};

const getPortFromRequest = (req: Request): string => {
  const host = req.headers.host;
  if (!host) return '';
  const parts = host.split(':');
  return parts.length === 2 ? `:${parts[1]}` : '';
};

const validateSchemata = async (
  pool: Pool,
  schemata: string[]
): Promise<string[]> => {
  if (!schemata.length) return [];
  const result = await pool.query(
    `SELECT schema_name FROM information_schema.schemata WHERE schema_name = ANY($1::text[])`,
    [schemata]
  );
  return result.rows.map((row: { schema_name: string }) => row.schema_name);
};

// ============================================================================
// Transform Functions
// ============================================================================

const transformServiceToApi = (svc: Service): ApiStructure => {
  const api = svc.data.api;
  const extSchemas =
    api.schemaNamesFromExt?.nodes?.map((n: SchemaNode) => n.schemaName) || [];
  const additionalSchemas =
    api.schemaNames?.nodes?.map((n: SchemaNode) => n.schemaName) || [];

  const domains =
    api.database?.sites?.nodes?.flatMap(
      (site: Site) =>
        site.domains?.nodes?.map((d: Domain) => {
          const hostname = d.subdomain
            ? `${d.subdomain}.${d.domain}`
            : d.domain;
          const protocol = d.domain === 'localhost' ? 'http://' : 'https://';
          return protocol + hostname;
        }) || []
    ) || [];

  return {
    dbname: api.dbname,
    anonRole: api.anonRole,
    roleName: api.roleName,
    schema: [...extSchemas, ...additionalSchemas],
    apiModules:
      api.apiModules?.nodes?.map((node: any) => ({
        name: node.name,
        data: node.data,
      })) || [],
    rlsModule: api.rlsModule,
    domains,
    databaseId: api.databaseId,
    isPublic: api.isPublic,
  };
};

// ============================================================================
// Cache Key Generation
// ============================================================================

const getSvcKey = (opts: PgpmOptions, req: Request): string => {
  const apiOpts = getApiOptions(opts);
  const domain = req.urlDomains.domain as string;
  const subdomains = (req.urlDomains.subdomains as string[]).filter(
    (name) => name !== 'www'
  );

  if (apiOpts.isPublic === false) {
    const dbId = req.get('X-Database-Id');
    if (req.get('X-Api-Name')) return `api:${dbId}:${req.get('X-Api-Name')}`;
    if (req.get('X-Schemata'))
      return `schemata:${dbId}:${req.get('X-Schemata')}`;
    if (req.get('X-Meta-Schema')) return `metaschema:api:${dbId}`;
  }

  return [...subdomains, domain].join('.');
};

// ============================================================================
// Service Builders (Header-based Config)
// ============================================================================

const buildServiceFromSchemas = (
  opts: PgpmOptions,
  schemas: string[],
  databaseId: string,
  key: string
): ServiceData => {
  const svc: ServiceData = {
    data: {
      api: {
        databaseId,
        isPublic: false,
        dbname: opts.pg?.database,
        anonRole: 'administrator',
        roleName: 'administrator',
        schemaNamesFromExt: {
          nodes: schemas.map((schemaName) => ({ schemaName })),
        },
        schemaNames: { nodes: [] },
        apiModules: [],
      },
    },
  };
  svcCache.set(key, svc);
  return svc;
};

// ============================================================================
// GraphQL Query Functions
// ============================================================================

const queryByDomain = async (
  client: GraphileQuery,
  opts: PgpmOptions,
  domain: string,
  subdomain: string | null,
  key: string,
  requestId?: string
): Promise<ServiceData | null> => {
  const prefix = requestId ? `[${requestId}]` : '';
  const apiOpts = getApiOptions(opts);

  debugLog(prefix, `Querying API by domain=${domain}, subdomain=${subdomain}`);

  const result = await client.query({
    role: 'administrator',
    query: ApiQuery as any,
    variables: { domain, subdomain },
  });

  if (result.errors?.length) {
    queryLog.error(`${prefix} GraphQL errors:`, result.errors);
    return null;
  }

  const node = (result?.data as any)?.domains?.nodes?.[0];
  if (!node?.api || node.api.isPublic !== apiOpts.isPublic) {
    debugLog(prefix, `No matching API for domain=${domain}`);
    return null;
  }

  const svc: ServiceData = { data: node };
  svcCache.set(key, svc);
  debugLog(prefix, `API cached with key=${key}`);
  return svc;
};

const queryByName = async (
  client: GraphileQuery,
  opts: PgpmOptions,
  name: string,
  databaseId: string,
  key: string,
  requestId?: string
): Promise<ServiceData | null> => {
  const prefix = requestId ? `[${requestId}]` : '';
  const apiOpts = getApiOptions(opts);

  debugLog(prefix, `Querying API by name=${name}`);

  const result = await client.query({
    role: 'administrator',
    query: ApiByNameQuery as any,
    variables: { databaseId, name },
  });

  if (result.errors?.length) {
    queryLog.error(`${prefix} GraphQL errors:`, result.errors);
    return null;
  }

  const data = result?.data as any;
  if (!data?.api || data.api.isPublic !== apiOpts.isPublic) {
    debugLog(prefix, `No matching API with name=${name}`);
    return null;
  }

  const svc: ServiceData = { data };
  svcCache.set(key, svc);
  debugLog(prefix, `API cached with key=${key}`);
  return svc;
};

const buildDevErrorHtml = async (
  client: GraphileQuery,
  req: Request
): Promise<ServiceData | null> => {
  if (!isDev()) return null;

  const result = await client.query({
    role: 'administrator',
    query: ListOfAllDomainsOfDb as any,
  });

  const apis = (result.data as any)?.apis?.nodes;
  if (result.errors?.length || !apis?.length) return null;

  const port = getPortFromRequest(req);
  const links = apis.flatMap((api: any) =>
    api.domains.nodes.map((d: any) => {
      const href = d.subdomain
        ? `http://${d.subdomain}.${d.domain}${port}/graphiql`
        : `http://${d.domain}${port}/graphiql`;
      return `<li><a href="${href}" class="text-brand hover:underline">${href}</a></li>`;
    })
  );

  const linksHtml = links.length
    ? `<ul class="mt-4 pl-5 list-disc space-y-1">${links.join('')}</ul>`
    : `<p class="text-gray-600">No APIs registered for this database.</p>`;

  return {
    data: { api: null },
    errorHtml: `<p class="text-sm text-gray-700">Try some of these:</p><div class="mt-4">${linksHtml}</div>`,
  };
};

// ============================================================================
// Main API Config Resolver
// ============================================================================

export const getApiConfig = async (
  opts: PgpmOptions,
  req: Request
): Promise<ServiceData | null> => {
  const requestId = getRequestId(req);
  const apiOpts = getApiOptions(opts);
  const key = getSvcKey(opts, req);
  req.svc_key = key;

  // Check cache
  if (svcCache.has(key)) {
    log.debug(req, `Cache HIT for key=${key}`);
    return svcCache.get(key) as ServiceData;
  }

  log.debug(req, `Cache MISS for key=${key}`);

  // Validate meta schemas
  const rootPool = getPgPool(opts.pg);
  const metaSchemas = apiOpts.metaSchemas || [];
  const validSchemas = await validateSchemata(rootPool, metaSchemas);

  if (!validSchemas.length) {
    const domain = req.urlDomains.domain;
    const subdomain = getSubdomain(req.urlDomains.subdomains as string[]);
    const error: any = new Error(
      `No valid schemas found for domain: ${domain}, subdomain: ${subdomain}`
    );
    error.code = 'NO_VALID_SCHEMAS';
    throw error;
  }

  // Build GraphQL client
  const settings = getGraphileSettings({ graphile: { schema: validSchemas } });
  // @ts-expect-error - settings type mismatch between packages
  const schema = await getSchema(rootPool, settings);
  // @ts-expect-error - settings type mismatch between packages
  const client = new GraphileQuery({ schema, pool: rootPool, settings });

  const domain = req.urlDomains.domain as string;
  const subdomain = getSubdomain(req.urlDomains.subdomains as string[]);

  // Handle private API header-based lookups
  if (apiOpts.isPublic === false) {
    const dbId = req.get('X-Database-Id') || '';

    if (req.get('X-Schemata')) {
      log.debug(req, `Using X-Schemata header`);
      const schemas = req
        .get('X-Schemata')!
        .split(',')
        .map((s) => s.trim());
      return buildServiceFromSchemas(opts, schemas, dbId, key);
    }

    if (req.get('X-Api-Name')) {
      log.debug(req, `Using X-Api-Name header`);
      return queryByName(
        client,
        opts,
        req.get('X-Api-Name')!,
        dbId,
        key,
        requestId
      );
    }

    if (req.get('X-Meta-Schema')) {
      log.debug(req, `Using X-Meta-Schema header`);
      return buildServiceFromSchemas(opts, metaSchemas, dbId, key);
    }
  }

  // Standard domain lookup
  const svc = await queryByDomain(
    client,
    opts,
    domain,
    subdomain,
    key,
    requestId
  );
  return svc || buildDevErrorHtml(client, req);
};

// ============================================================================
// Express Middleware
// ============================================================================

export const createApiMiddleware = (opts: PgpmOptions) => {
  const apiOpts = getApiOptions(opts);

  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    log.debug(req, `Started for ${req.method} ${req.originalUrl}`);

    // Fast path: Meta API disabled
    if (apiOpts.enableMetaApi === false) {
      req.api = {
        dbname: opts.pg?.database ?? '',
        anonRole: apiOpts.anonRole || 'anonymous',
        roleName: apiOpts.roleName || 'authenticated',
        schema: apiOpts.exposedSchemas || [],
        apiModules: [],
        domains: [],
        databaseId: apiOpts.defaultDatabaseId,
        isPublic: false,
      };
      req.databaseId = apiOpts.defaultDatabaseId;
      req.svc_key = 'meta-api-off';
      log.debug(req, `Meta API disabled, using static config`);
      return next();
    }

    try {
      const svc = await getApiConfig(opts, req);

      if (svc?.errorHtml) {
        log.warn(req, `API not found, showing suggestions`);
        res
          .status(404)
          .send(errorPage404Message('API not found', svc.errorHtml));
        return;
      }

      if (!svc) {
        log.warn(req, `No API service found`);
        res
          .status(404)
          .send(
            errorPage404Message(
              'API service not found for the given domain/subdomain.'
            )
          );
        return;
      }

      const api = transformServiceToApi(svc as Service);
      req.api = api;
      req.databaseId = api.databaseId;
      log.debug(
        req,
        `Resolved: db=${api.dbname}, schemas=[${api.schema?.join(', ')}]`
      );
      next();
    } catch (e: any) {
      if (e.code === 'NO_VALID_SCHEMAS') {
        log.warn(req, e.message);
        res.status(404).send(errorPage404Message(e.message));
      } else if (e.message?.includes('does not exist')) {
        log.warn(req, `Resource not found: ${e.message}`);
        res
          .status(404)
          .send(
            errorPage404Message(
              "The resource you're looking for does not exist."
            )
          );
      } else {
        log.error(req, `Error: ${e.message}`, e);
        res.status(500).send(errorPage50x);
      }
    }
  };
};
