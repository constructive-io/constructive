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
/**
 * Normalizes API records into ApiStructure
 */
import {
  apiListSelect,
  apiSelect,
  connectionFirst,
  createGraphileOrm,
  domainSelect,
  normalizeApiRecord,
  type ApiListRecord,
  type ApiQueryOps,
  type ApiRecord,
  type DomainLookupModel,
  type DomainRecord,
} from './gql';
import { ApiStructure } from '../types';
import './types'; // for Request type

export { normalizeApiRecord } from './gql';

const log = new Logger('api');
const isDev = () => getNodeEnv() === 'development';

type ApiOptions = PgpmOptions & {
  api?: {
    enableServicesApi?: boolean;
    exposedSchemas?: string[];
    anonRole?: string;
    roleName?: string;
    defaultDatabaseId?: string;
    metaSchemas?: string[];
    isPublic?: boolean;
  };
};

type ApiError = { errorHtml: string };
type ApiConfigResult = ApiStructure | ApiError | null;
type GraphileQuerySettings = ReturnType<typeof getGraphileSettings> & {
  schema: string[] | string;
};

const isApiError = (svc: ApiConfigResult): svc is ApiError =>
  !!svc && typeof (svc as ApiError).errorHtml === 'string';

const getPortFromRequest = (req: Request): string | null => {
  const host = req.headers.host;
  if (!host) return null;

  const parts = host.split(':');
  return parts.length === 2 ? `:${parts[1]}` : null;
};

const getUrlDomains = (
  req: Request
): { domain: string; subdomains: string[] } => {
  const urlDomains = req.urlDomains ?? {};
  const domain = typeof urlDomains.domain === 'string' ? urlDomains.domain : '';
  const subdomains = Array.isArray(urlDomains.subdomains)
    ? urlDomains.subdomains.filter(
        (subdomain): subdomain is string => typeof subdomain === 'string'
      )
    : [];

  return { domain, subdomains };
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

const getHardCodedSchemata = ({
  opts,
  schemata,
  databaseId,
  key,
}: {
  opts: ApiOptions;
  schemata: string;
  databaseId?: string;
  key: string;
}): ApiStructure => {
  const schema = schemata
    .split(',')
    .map((schemaName) => schemaName.trim())
    .filter((schemaName) => schemaName.length > 0);
  const api: ApiStructure = {
    dbname: opts.pg?.database ?? '',
    anonRole: 'administrator',
    roleName: 'administrator',
    schema,
    apiModules: [],
    domains: [],
    databaseId,
    isPublic: false,
  };
  svcCache.set(key, api);
  return api;
};

const getMetaSchema = ({
  opts,
  key,
  databaseId,
}: {
  opts: ApiOptions;
  key: string;
  databaseId?: string;
}): ApiStructure => {
  const apiOpts = opts.api || {};
  const schemata = apiOpts.metaSchemas || [];
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

const queryServiceByDomainAndSubdomain = async ({
  opts,
  key,
  domainModel,
  domain,
  subdomain,
}: {
  opts: ApiOptions;
  key: string;
  domainModel: DomainLookupModel;
  domain: string;
  subdomain: string | null;
}): Promise<ApiStructure | null> => {
  const where = {
    domain: { equalTo: domain },
    subdomain:
      subdomain === null || subdomain === undefined
        ? { isNull: true }
        : { equalTo: subdomain },
  };

  const result = await domainModel
    .findFirst({ select: domainSelect, where })
    .execute();

  if (!result.ok) {
    log.error('GraphQL query errors:', result.errors);
    return null;
  }

  const domainRecord = result.data.domains.nodes[0] as DomainRecord | undefined;
  const api = domainRecord?.api as ApiRecord | undefined;
  const apiPublic = opts.api?.isPublic;
  if (!api || api.isPublic !== apiPublic) return null;

  const apiStructure = normalizeApiRecord(api);
  svcCache.set(key, apiStructure);
  return apiStructure;
};

export const queryServiceByApiName = async ({
  opts,
  key,
  queryOps,
  databaseId,
  name,
}: {
  opts: ApiOptions;
  key: string;
  queryOps: ApiQueryOps;
  databaseId?: string;
  name: string;
}): Promise<ApiStructure | null> => {
  if (!databaseId) return null;
  const result = await queryOps
    .apiByDatabaseIdAndName({ databaseId, name }, { select: apiSelect })
    .execute();

  if (!result.ok) {
    log.error('GraphQL query errors:', result.errors);
    return null;
  }

  const api = result.data.apiByDatabaseIdAndName as ApiRecord | undefined;
  const apiPublic = opts.api?.isPublic;
  if (api && api.isPublic === apiPublic) {
    const apiStructure = normalizeApiRecord(api);
    svcCache.set(key, apiStructure);
    return apiStructure;
  }
  return null;
};

export const getSvcKey = (opts: ApiOptions, req: Request): string => {
  const { domain, subdomains } = getUrlDomains(req);
  const key = subdomains
    .filter((name: string) => !['www'].includes(name))
    .concat(domain)
    .join('.');

  const apiPublic = opts.api?.isPublic;
  if (apiPublic === false) {
    if (req.get('X-Schemata')) {
      return (
        'schemata:' + req.get('X-Database-Id') + ':' + req.get('X-Schemata')
      );
    }
    if (req.get('X-Api-Name')) {
      return 'api:' + req.get('X-Database-Id') + ':' + req.get('X-Api-Name');
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
    const allSchemata = apiOpts.metaSchemas || [];
    const validatedSchemata = await validateSchemata(rootPgPool, allSchemata);

    if (validatedSchemata.length === 0) {
      const apiOpts2 = opts.api || {};
      const message = `No valid schemas found. Configured metaSchemas: [${(apiOpts2.metaSchemas || []).join(', ')}]`;
      if (isDev()) log.debug(message);
      const error = new Error(message) as Error & { code?: string };
      error.code = 'NO_VALID_SCHEMAS';
      throw error;
    }

    const settings = getGraphileSettings({
      graphile: {
        schema: validatedSchemata,
      },
    });
    const graphileSettings: GraphileQuerySettings = {
      ...settings,
      schema: validatedSchemata,
    };

    const schema = await getSchema(rootPgPool, graphileSettings);
    const graphileClient = new GraphileQuery({
      schema,
      pool: rootPgPool,
      settings: graphileSettings,
    });
    const orm = createGraphileOrm(graphileClient);

    const apiPublic = opts.api?.isPublic;
    if (apiPublic === false) {
      const schemataHeader = req.get('X-Schemata');
      const apiNameHeader = req.get('X-Api-Name');
      const metaSchemaHeader = req.get('X-Meta-Schema');
      const databaseIdHeader = req.get('X-Database-Id');
      if (schemataHeader) {
        apiConfig = getHardCodedSchemata({
          opts,
          key,
          schemata: schemataHeader,
          databaseId: databaseIdHeader,
        });
      } else if (apiNameHeader) {
        apiConfig = await queryServiceByApiName({
          opts,
          key,
          queryOps: orm.query,
          name: apiNameHeader,
          databaseId: databaseIdHeader,
        });
      } else if (metaSchemaHeader) {
        apiConfig = getMetaSchema({
          opts,
          key,
          databaseId: databaseIdHeader,
        });
      } else {
        apiConfig = await queryServiceByDomainAndSubdomain({
          opts,
          key,
          domainModel: orm.domain,
          domain,
          subdomain,
        });
      }
    } else {
      apiConfig = await queryServiceByDomainAndSubdomain({
        opts,
        key,
        domainModel: orm.domain,
        domain,
        subdomain,
      });

      if (!apiConfig) {
        // IMPORTANT NOTE: ONLY DO THIS IN DEV MODE
        if (getNodeEnv() === 'development') {
          const fallbackResult = await orm.api
            .findMany({ select: apiListSelect, first: connectionFirst })
            .execute();

          if (fallbackResult.ok && fallbackResult.data.apis.nodes.length) {
            const port = getPortFromRequest(req);

            const allDomains = fallbackResult.data.apis.nodes.flatMap(
              (api: ApiListRecord) =>
                api.domains.nodes.map((d) => ({
                  domain: d.domain,
                  subdomain: d.subdomain,
                  href: d.subdomain
                    ? `http://${d.subdomain}.${d.domain}${port}/graphiql`
                    : `http://${d.domain}${port}/graphiql`,
                }))
            );
            type DomainLink = (typeof allDomains)[number];

            const linksHtml = allDomains.length
              ? `<ul class="mt-4 pl-5 list-disc space-y-1">` +
                allDomains
                  .map(
                    (domainLink: DomainLink) =>
                      `<li><a href="${domainLink.href}" class="text-brand hover:underline">${domainLink.href}</a></li>`
                  )
                  .join('') +
                `</ul>`
              : `<p class="text-gray-600">No APIs are currently registered for this database.</p>`;

            const errorHtml = `
          <p class="text-sm text-gray-700">Try some of these:</p>
          <div class="mt-4">
            ${linksHtml}
          </div>
        `.trim();

            return { errorHtml };
          }
        }
      }
    }
  }
  return apiConfig;
};
