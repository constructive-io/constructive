import { getNodeEnv } from '@constructive-io/graphql-env';
import { ConstructiveOptions } from '@constructive-io/graphql-types';
import { Logger } from '@pgpmjs/logger';
import { svcCache } from '@pgpmjs/server-utils';
import { NextFunction, Request, Response } from 'express';
import { getSchema, GraphileQuery } from 'graphile-query';
import { getGraphileSettings } from 'graphile-settings';
import { Pool } from 'pg';
import { getPgPool } from 'pg-cache';

import errorPage50x from '../errors/50x';
import errorPage404Message from '../errors/404-message';
/**
 * Transforms the old service structure to the new api structure
 */
import {
  ApiErrorWithCode,
  ApiModule,
  ApiStructure,
  Domain,
  ErrorResult,
  SchemaNode,
  Service,
  Site,
} from '../types';
import {
  buildApiByDatabaseIdAndName,
  buildDomainLookup,
  buildListApis,
} from './gql';
import './types'; // for Request type

const log = new Logger('api');
const isDev = () => getNodeEnv() === 'development';

/** Local interface for API listing query results */
interface FallbackApi {
  domains: { nodes: Domain[] };
}

/** Local interface for link results */
interface DomainLink {
  domain: string;
  subdomain?: string;
  href: string;
}

const transformServiceToApi = (svc: Service): ApiStructure => {
  const api = svc.data.api;
  const schemaNames =
    api.apiExtensions?.nodes?.map((n: SchemaNode) => n.schemaName) || [];
  const additionalSchemas =
    api.schemasByApiSchemaApiIdAndSchemaId?.nodes?.map((n: SchemaNode) => n.schemaName) || [];

  let domains: string[] = [];
  if (api.database?.sites?.nodes) {
    domains = api.database.sites.nodes.reduce((acc: string[], site: Site) => {
      if (site.domains?.nodes && site.domains.nodes.length) {
        const siteUrls = site.domains.nodes.map((domain: Domain) => {
          const hostname = domain.subdomain
            ? `${domain.subdomain}.${domain.domain}`
            : domain.domain;
          const protocol =
            domain.domain === 'localhost' ? 'http://' : 'https://';
          return protocol + hostname;
        });
        return [...acc, ...siteUrls];
      }
      return acc;
    }, []);
  }

  return {
    dbname: api.dbname,
    anonRole: api.anonRole,
    roleName: api.roleName,
    schema: [...schemaNames, ...additionalSchemas],
    apiModules:
      api.apiModules?.nodes?.map((node) => ({
        name: node.name,
        data: node.data,
      })) || [],
    rlsModule: api.rlsModule,
    domains,
    databaseId: api.databaseId,
    isPublic: api.isPublic,
  };
};

const getPortFromRequest = (req: Request): string | null => {
  const host = req.headers.host;
  if (!host) return null;

  const parts = host.split(':');
  return parts.length === 2 ? `:${parts[1]}` : null;
};

export const getSubdomain = (reqDomains: string[]): string | null => {
  const names = reqDomains.filter((name) => !['www'].includes(name));
  return !names.length ? null : names.join('.');
};

export const createApiMiddleware = (opts: ConstructiveOptions) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (opts.api?.enableServicesApi === false) {
      const schemas = opts.api.exposedSchemas;
      const anonRole = opts.api.anonRole;
      const roleName = opts.api.roleName;
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
      const svc = await getApiConfig(opts, req);

      if (!svc) {
        res
          .status(404)
          .send(
            errorPage404Message(
              'API service not found for the given domain/subdomain.'
            )
          );
        return;
      }
      if ('errorHtml' in svc) {
        res
          .status(404)
          .send(errorPage404Message('API not found', svc.errorHtml));
        return;
      }
      const api = transformServiceToApi(svc);
      req.api = api;
      req.databaseId = api.databaseId;
      if (isDev())
        log.debug(
          `Resolved API: db=${api.dbname}, schemas=[${api.schema?.join(', ')}]`
        );
      next();
    } catch (e: unknown) {
      const error = e as ApiErrorWithCode;
      if (error.code === 'NO_VALID_SCHEMAS') {
        res.status(404).send(errorPage404Message(error.message));
      } else if (error.message?.match(/does not exist/)) {
        res
          .status(404)
          .send(
            errorPage404Message(
              "The resource you're looking for does not exist."
            )
          );
      } else {
        log.error('API middleware error:', error);
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
  opts: ConstructiveOptions;
  schemata: string;
  databaseId: string;
  key: string;
}): Service => {
  const svc: Service = {
    data: {
      api: {
        databaseId,
        isPublic: false,
        dbname: opts.pg.database,
        anonRole: 'administrator',
        roleName: 'administrator',
        apiExtensions: {
          nodes: schemata
            .split(',')
            .map((schema) => schema.trim())
            .map((schemaName) => ({ schemaName })),
        },
        schemasByApiSchemaApiIdAndSchemaId: { nodes: [] as Array<{ schemaName: string }> },
        apiModules: { nodes: [] as ApiModule[] },
      },
    },
  };
  svcCache.set(key, svc);
  return svc;
};

const getMetaSchema = ({
  opts,
  key,
  databaseId,
}: {
  opts: ConstructiveOptions;
  key: string;
  databaseId: string;
}): Service => {
  const schemata = opts.api?.metaSchemas || [];
  const svc: Service = {
    data: {
      api: {
        databaseId,
        isPublic: false,
        dbname: opts.pg.database,
        anonRole: 'administrator',
        roleName: 'administrator',
        apiExtensions: {
          nodes: schemata.map((schemaName: string) => ({ schemaName })),
        },
        schemasByApiSchemaApiIdAndSchemaId: { nodes: [] as Array<{ schemaName: string }> },
        apiModules: { nodes: [] as ApiModule[] },
      },
    },
  };
  svcCache.set(key, svc);
  return svc;
};

const queryServiceByDomainAndSubdomain = async ({
  opts,
  key,
  client,
  domain,
  subdomain,
}: {
  opts: ConstructiveOptions;
  key: string;
  client: GraphileQuery;
  domain: string;
  subdomain: string;
}): Promise<Service | null> => {
  const doc = buildDomainLookup({ domain, subdomain });
  const result = await client.query({
    role: 'administrator',
    query: doc.document,
    variables: doc.variables,
  });

  if (result.errors?.length) {
    log.error('GraphQL query errors:', result.errors);
    return null;
  }

  const nodes = result?.data?.domains?.nodes;
  if (nodes?.length) {
    const data = nodes[0];
    const apiPublic = opts.api?.isPublic;
    if (!data.api || data.api.isPublic !== apiPublic) return null;
    const svc = { data };
    svcCache.set(key, svc);
    return svc;
  }

  return null;
};

const queryServiceByApiName = async ({
  opts,
  key,
  client,
  databaseId,
  name,
}: {
  opts: ConstructiveOptions;
  key: string;
  client: GraphileQuery;
  databaseId: string;
  name: string;
}): Promise<Service | null> => {
  const doc = buildApiByDatabaseIdAndName({ databaseId, name });
  const result = await client.query({
    role: 'administrator',
    query: doc.document,
    variables: doc.variables,
  });

  if (result.errors?.length) {
    log.error('GraphQL query errors:', result.errors);
    return null;
  }

  const api = result?.data?.apiByDatabaseIdAndName;
  const apiPublic = opts.api?.isPublic;
  if (api && api.isPublic === apiPublic) {
    const svc = { data: { api } };
    svcCache.set(key, svc);
    return svc;
  }
  return null;
};

const getSvcKey = (opts: ConstructiveOptions, req: Request): string => {
  const domain = req.urlDomains.domain;
  const key = (req.urlDomains.subdomains as string[])
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
  opts: ConstructiveOptions,
  req: Request
): Promise<Service | ErrorResult | null> => {
  const rootPgPool = getPgPool(opts.pg);
  // @ts-ignore
  const subdomain = getSubdomain(req.urlDomains.subdomains);
  const domain: string = req.urlDomains.domain as string;

  const key = getSvcKey(opts, req);
  req.svc_key = key;

  let svc: Service | null | undefined;
  if (svcCache.has(key)) {
    if (isDev()) log.debug(`Cache HIT for key=${key}`);
    svc = svcCache.get(key);
  } else {
    if (isDev()) log.debug(`Cache MISS for key=${key}, looking up API`);
    const allSchemata = opts.api?.metaSchemas || [];
    const validatedSchemata = await validateSchemata(rootPgPool, allSchemata);

    if (validatedSchemata.length === 0) {
      const message = `No valid schemas found. Configured metaSchemas: [${(opts.api?.metaSchemas || []).join(', ')}]`;
      if (isDev()) log.debug(message);
      const error: ApiErrorWithCode = new Error(message) as ApiErrorWithCode;
      error.code = 'NO_VALID_SCHEMAS';
      throw error;
    }

    const settings = getGraphileSettings({
      graphile: {
        schema: validatedSchemata,
      },
    });

    // @ts-ignore
    const schema = await getSchema(rootPgPool, settings);
    // @ts-ignore
    const client = new GraphileQuery({ schema, pool: rootPgPool, settings });

    const apiPublic = opts.api?.isPublic;
    if (apiPublic === false) {
      if (req.get('X-Schemata')) {
        svc = getHardCodedSchemata({
          opts,
          key,
          schemata: req.get('X-Schemata'),
          databaseId: req.get('X-Database-Id'),
        });
      } else if (req.get('X-Api-Name')) {
        svc = await queryServiceByApiName({
          opts,
          key,
          client,
          name: req.get('X-Api-Name'),
          databaseId: req.get('X-Database-Id'),
        });
      } else if (req.get('X-Meta-Schema')) {
        svc = getMetaSchema({
          opts,
          key,
          databaseId: req.get('X-Database-Id'),
        });
      } else {
        svc = await queryServiceByDomainAndSubdomain({
          opts,
          key,
          client,
          domain,
          subdomain,
        });
      }
    } else {
      svc = await queryServiceByDomainAndSubdomain({
        opts,
        key,
        client,
        domain,
        subdomain,
      });

      if (!svc) {
        if (getNodeEnv() === 'development') {
          // TODO ONLY DO THIS IN DEV MODE
          const fallbackResult = await client.query({
            role: 'administrator',
            // @ts-ignore
            query: buildListApis().document,
          });

          if (
            !fallbackResult.errors?.length &&
            fallbackResult.data?.apis?.nodes?.length
          ) {
            const port = getPortFromRequest(req);

            const allDomains: DomainLink[] = fallbackResult.data.apis.nodes.flatMap(
              (api: FallbackApi) =>
                api.domains.nodes.map((d: Domain) => ({
                  domain: d.domain,
                  subdomain: d.subdomain,
                  href: d.subdomain
                    ? `http://${d.subdomain}.${d.domain}${port}/graphiql`
                    : `http://${d.domain}${port}/graphiql`,
                }))
            );

            const linksHtml = allDomains.length
              ? `<ul class="mt-4 pl-5 list-disc space-y-1">` +
                allDomains
                  .map(
                    (d: DomainLink) =>
                      `<li><a href="${d.href}" class="text-brand hover:underline">${d.href}</a></li>`
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

            return {
              errorHtml,
            };
          }
        }
      }
    }
  }
  return svc;
};
