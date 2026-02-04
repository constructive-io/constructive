import { getNodeEnv } from '@constructive-io/graphql-env';
import { Logger } from '@pgpmjs/logger';
import { svcCache } from '@pgpmjs/server-utils';
import { parseUrl } from '@constructive-io/url-domains';
import { NextFunction, Request, Response } from 'express';
import { Pool } from 'pg';
import { getPgPool } from 'pg-cache';
import { getPgEnvOptions } from 'pg-env';
import { execute } from 'grafast';
import { postgraphile, type PostGraphileInstance } from 'postgraphile';
import { getGraphilePreset, makePgService } from 'graphile-settings';
import { withPgClientFromPgService } from 'graphile-build-pg';
import {
  parse,
  type GraphQLSchema,
  type DocumentNode,
  type ExecutionResult,
  type GraphQLError,
} from 'graphql';
import type { GraphileConfig } from 'graphile-config';

import errorPage50x from '../errors/50x';
import errorPage404Message from '../errors/404-message';
import { ApiConfigResult, ApiError, ApiOptions, ApiStructure } from '../types';
import './types'; // for Request type

const log = new Logger('api');
const isDev = () => getNodeEnv() === 'development';

// =============================================================================
// Services GraphQL Executor - Grafast-based queries for services_public
// =============================================================================

/**
 * Cache entry for services PostGraphile instance
 */
interface ServicesExecutorEntry {
  pgl: PostGraphileInstance;
  schema: GraphQLSchema;
  resolvedPreset: GraphileConfig.ResolvedPreset;
  pgService: ReturnType<typeof makePgService>;
}

/**
 * Cache for services PostGraphile instances, keyed by connection string
 * This allows different databases to have their own executor
 */
const servicesExecutorCache = new Map<string, ServicesExecutorEntry>();

/**
 * Build connection string from pg config components
 */
const buildConnectionString = (
  user: string,
  password: string,
  host: string,
  port: string | number,
  database: string
): string => `postgres://${user}:${password}@${host}:${port}/${database}`;

/**
 * Get or create the services GraphQL executor for a specific database
 *
 * This creates a dedicated PostGraphile instance for querying the services_public
 * and metaschema_public schemas with administrator role. The instance is cached
 * per connection string for reuse across requests to the same database.
 */
const getServicesExecutor = async (opts: ApiOptions): Promise<{
  schema: GraphQLSchema;
  resolvedPreset: GraphileConfig.ResolvedPreset;
  pgService: ReturnType<typeof makePgService>;
}> => {
  const pgConfig = getPgEnvOptions(opts.pg);
  const connectionString = buildConnectionString(
    pgConfig.user,
    pgConfig.password,
    pgConfig.host,
    pgConfig.port,
    pgConfig.database
  );

  const cached = servicesExecutorCache.get(connectionString);
  if (cached) {
    return {
      schema: cached.schema,
      resolvedPreset: cached.resolvedPreset,
      pgService: cached.pgService,
    };
  }

  const pgService = makePgService({
    connectionString,
    schemas: ['services_public', 'metaschema_public'],
  });

  const basePreset = getGraphilePreset({});

  const preset: GraphileConfig.Preset = {
    extends: [basePreset],
    pgServices: [pgService],
    grafast: {
      context: () => ({
        pgSettings: { role: 'administrator' },
      }),
    },
  };

  const pgl = postgraphile(preset);
  const schema = await pgl.getSchema();
  const resolvedPreset = pgl.getResolvedPreset();

  servicesExecutorCache.set(connectionString, {
    pgl,
    schema,
    resolvedPreset,
    pgService,
  });
  log.debug(`Services GraphQL executor initialized for ${pgConfig.database}`);

  return { schema, resolvedPreset, pgService };
};

// =============================================================================
// GraphQL Query Definitions
// =============================================================================

/**
 * GraphQL query for looking up API by domain and subdomain (with subdomain value)
 * Note: We fetch all domains and filter in code to avoid filter type issues
 * Uses inflector naming with proper relation names:
 * - api for domain -> api relation
 * - apiSchemas for api -> api_schemas relation
 * - schema for api_schema -> schema relation (cross-schema relation)
 */
const DOMAIN_LOOKUP_QUERY_WITH_SUBDOMAIN = `
  query QueryServiceByDomainAndSubdomain {
    domains(first: 100) {
      nodes {
        domain
        subdomain
        api {
          databaseId
          dbname
          roleName
          anonRole
          isPublic
          apiSchemas(first: 1000) {
            nodes {
              schema {
                schemaName
              }
            }
          }
        }
      }
    }
  }
`;

/**
 * GraphQL query for looking up API by domain with null subdomain
 * Note: We use the same query for both cases and filter in code
 * Uses inflector naming with proper relation names
 */
const DOMAIN_LOOKUP_QUERY_NULL_SUBDOMAIN = `
  query QueryServiceByDomainNullSubdomain {
    domains(first: 100) {
      nodes {
        domain
        subdomain
        api {
          databaseId
          dbname
          roleName
          anonRole
          isPublic
          apiSchemas(first: 1000) {
            nodes {
              schema {
                schemaName
              }
            }
          }
        }
      }
    }
  }
`;

/**
 * GraphQL query for looking up API by database ID and name
 * Uses junction table approach with inflector relation names:
 * - apiSchemas for api -> api_schemas relation
 * - schema for api_schema -> schema relation (cross-schema relation)
 */
const API_NAME_LOOKUP_QUERY = `
  query QueryServiceByApiName($databaseId: UUID!, $name: String!, $isPublic: Boolean!) {
    apis(first: 1, filter: {
      databaseId: { equalTo: $databaseId }
      name: { equalTo: $name }
      isPublic: { equalTo: $isPublic }
    }) {
      nodes {
        databaseId
        dbname
        roleName
        anonRole
        isPublic
        apiSchemas(first: 1000) {
          nodes {
            schema {
              schemaName
            }
          }
        }
      }
    }
  }
`;

// Cache parsed documents for performance
let domainLookupWithSubdomainDocument: DocumentNode | null = null;
let domainLookupNullSubdomainDocument: DocumentNode | null = null;
let apiNameLookupDocument: DocumentNode | null = null;

const getDomainLookupDocument = (hasSubdomain: boolean): DocumentNode => {
  if (hasSubdomain) {
    if (!domainLookupWithSubdomainDocument) {
      domainLookupWithSubdomainDocument = parse(DOMAIN_LOOKUP_QUERY_WITH_SUBDOMAIN);
    }
    return domainLookupWithSubdomainDocument;
  } else {
    if (!domainLookupNullSubdomainDocument) {
      domainLookupNullSubdomainDocument = parse(DOMAIN_LOOKUP_QUERY_NULL_SUBDOMAIN);
    }
    return domainLookupNullSubdomainDocument;
  }
};

const getApiNameLookupDocument = (): DocumentNode => {
  if (!apiNameLookupDocument) {
    apiNameLookupDocument = parse(API_NAME_LOOKUP_QUERY);
  }
  return apiNameLookupDocument;
};

// Type definitions for GraphQL response
interface ApiSchemaNodeData {
  schema?: { schemaName?: string };
}

interface ApiNodeData {
  databaseId?: string;
  dbname?: string;
  roleName?: string;
  anonRole?: string;
  isPublic?: boolean;
  // Junction table approach with inflector relation names:
  // apiSchemas -> schema -> schemaName
  apiSchemas?: {
    nodes?: ApiSchemaNodeData[];
  };
}

interface DomainNodeData {
  domain?: string;
  subdomain?: string | null;
  api?: ApiNodeData;
}

interface DomainLookupResult {
  domains?: {
    nodes?: DomainNodeData[];
  };
}

interface ApiNameLookupResult {
  apis?: {
    nodes?: ApiNodeData[];
  };
}

/**
 * Transform API node data to ApiStructure
 * Uses junction table approach with inflector relation names:
 * apiSchemas -> schema -> schemaName
 */
const transformApiNodeToStructure = (
  apiData: ApiNodeData,
  opts: ApiOptions
): ApiStructure => {
  // Extract schemas from junction table
  const schemas = apiData.apiSchemas?.nodes?.map(
    (n: ApiSchemaNodeData) => n.schema?.schemaName
  ).filter((s: string | undefined): s is string => !!s) || [];

  return {
    dbname: apiData.dbname || opts.pg?.database || '',
    anonRole: apiData.anonRole || 'anon',
    roleName: apiData.roleName || 'authenticated',
    schema: schemas,
    apiModules: [],
    domains: [],
    databaseId: apiData.databaseId,
    isPublic: apiData.isPublic,
  };
};

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
    try {
      const apiConfig = await getApiConfig(opts, req);

      if (isApiError(apiConfig)) {
        res
          .status(404)
          .send(errorPage404Message('API not found', apiConfig.errorHtml));
        return;
      } else if (!apiConfig) {
        res
          .status(404)
          .send(
            errorPage404Message(
              'API service not found for the given domain/subdomain.'
            )
          );
        return;
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
        res.status(404).send(errorPage404Message(err.message));
      } else if (err.message?.match(/does not exist/)) {
        res
          .status(404)
          .send(
            errorPage404Message(
              "The resource you're looking for does not exist."
            )
          );
      } else {
        log.error('API middleware error:', err);
        res.status(500).send(errorPage50x);
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
 * Query API by domain and subdomain using Grafast GraphQL execution
 *
 * Uses the services GraphQL executor to query the services_public schema
 * for API configuration based on domain and subdomain.
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
  const apiPublic = opts.api?.isPublic ?? false;

  try {
    const { schema, resolvedPreset, pgService } = await getServicesExecutor(opts);

    log.debug(
      `[domain-lookup] domain=${domain} subdomain=${subdomain} isPublic=${apiPublic}`
    );

    // Build context with withPgClient from the pgService
    const contextValue: Record<string, unknown> = {
      pgSettings: { role: 'administrator' },
    };
    // Add withPgClient using the pgService's key (default is 'withPgClient')
    const withPgClientKey = pgService.withPgClientKey ?? 'withPgClient';
    contextValue[withPgClientKey] = withPgClientFromPgService.bind(
      null,
      pgService
    );

    // Fetch all domains and filter in code to avoid filter type issues with hostname domain
    const document = getDomainLookupDocument(subdomain !== null);

    const result = (await execute({
      schema,
      document,
      contextValue,
      resolvedPreset,
    })) as ExecutionResult<DomainLookupResult>;

    if (isDev()) {
      log.debug(
        `[domain-lookup] result nodes: ${result.data?.domains?.nodes?.length ?? 0}`
      );
    }

    if (result.errors?.length) {
      const errorMessages = result.errors
        .map((e: GraphQLError) => e.message)
        .join(', ');
      log.debug(`GraphQL errors in domain lookup: ${errorMessages}`);
      // Check if it's a "does not exist" error (schema not present)
      if (errorMessages.includes('does not exist')) {
        log.debug(`services_public schema not found, skipping domain lookup`);
        return null;
      }
    }

    // Filter results in code based on domain, subdomain, and api.isPublic
    const matchingNode = result.data?.domains?.nodes?.find((node: DomainNodeData) => {
      if (node.domain !== domain) return false;
      if (subdomain === null) {
        if (node.subdomain !== null && node.subdomain !== undefined)
          return false;
      } else {
        if (node.subdomain !== subdomain) return false;
      }
      if (node.api?.isPublic !== apiPublic) return false;
      return true;
    });

    const apiData = matchingNode?.api;
    if (!apiData) {
      log.debug(
        `[domain-lookup] No API found for domain=${domain} subdomain=${subdomain} isPublic=${apiPublic}`
      );
      return null;
    }

    const apiStructure = transformApiNodeToStructure(apiData, opts);
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
 * Query API by name using Grafast GraphQL execution
 *
 * Uses the services GraphQL executor to query the services_public schema
 * for API configuration based on database ID and API name.
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
  const apiPublic = opts.api?.isPublic ?? false;

  try {
    const { schema, resolvedPreset, pgService } = await getServicesExecutor(opts);

    log.debug(
      `[api-name-lookup] databaseId=${databaseId} name=${name} isPublic=${apiPublic}`
    );

    // Build context with withPgClient from the pgService
    const contextValue: Record<string, unknown> = {
      pgSettings: { role: 'administrator' },
    };
    // Add withPgClient using the pgService's key (default is 'withPgClient')
    const withPgClientKey = pgService.withPgClientKey ?? 'withPgClient';
    contextValue[withPgClientKey] = withPgClientFromPgService.bind(
      null,
      pgService
    );

    const result = (await execute({
      schema,
      document: getApiNameLookupDocument(),
      variableValues: { databaseId, name, isPublic: apiPublic },
      contextValue,
      resolvedPreset,
    })) as ExecutionResult<ApiNameLookupResult>;

    if (isDev()) {
      log.debug(`[api-name-lookup] found: ${result.data?.apis?.nodes?.length ?? 0}`);
    }

    if (result.errors?.length) {
      const errorMessages = result.errors
        .map((e: GraphQLError) => e.message)
        .join(', ');
      log.debug(`GraphQL errors in API name lookup: ${errorMessages}`);
      // Check if it's a "does not exist" error (schema not present)
      if (errorMessages.includes('does not exist')) {
        log.debug(`services_public schema not found, skipping API name lookup`);
        return null;
      }
    }

    const apiData = result.data?.apis?.nodes?.[0];
    if (!apiData) {
      log.debug(`[api-name-lookup] No API found for databaseId=${databaseId} name=${name}`);
      return null;
    }

    // Extract schemas from junction table with inflector relation names
    const schemas = apiData.apiSchemas?.nodes?.map(
      (n: ApiSchemaNodeData) => n.schema?.schemaName
    ).filter((s: string | undefined): s is string => !!s) || [];

    if (isDev()) {
      log.debug(`[api-name-lookup] resolved schemas: [${schemas.join(', ')}]`);
    }

    const apiStructure: ApiStructure = {
      dbname: apiData.dbname || opts.pg?.database || '',
      anonRole: apiData.anonRole || 'anon',
      roleName: apiData.roleName || 'authenticated',
      schema: schemas,
      apiModules: [],
      domains: [],
      databaseId: apiData.databaseId,
      isPublic: apiData.isPublic,
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
