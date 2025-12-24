import { getNodeEnv } from '@constructive-io/graphql-env';
import { svcCache } from '@pgpmjs/server-utils';
import { PgpmOptions } from '@pgpmjs/types';
import { NextFunction, Request, Response } from 'express';
import { Pool } from 'pg';
import { getPgPool } from 'pg-cache';

import errorPage50x from '../errors/50x';
import errorPage404Message from '../errors/404-message';
import { ApiStructure, Domain, SchemaNode, Service, Site } from '../types';
import './types';

const transformServiceToApi = (svc: Service): ApiStructure => {
  const api = svc.data.api;
  const schemaNames =
    api.schemaNamesFromExt?.nodes?.map((n: SchemaNode) => n.schemaName) || [];
  const additionalSchemas =
    api.schemaNames?.nodes?.map((n: SchemaNode) => n.schemaName) || [];

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

export const getSubdomain = (reqDomains: string[]): string | null => {
  const names = reqDomains.filter((name) => !['www'].includes(name));
  return !names.length ? null : names.join('.');
};

export const createApiMiddleware = (opts: any) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (opts.api?.enableMetaApi === false) {
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
      return next();
    }

    try {
      const key = getSvcKey(opts, req);
      req.svc_key = key;

      let svc;
      if (svcCache.has(key)) {
        svc = svcCache.get(key);
      } else {
        if (req.get('X-Schemata')) {
          svc = getHardCodedSchemata({
            opts,
            key,
            schemata: req.get('X-Schemata') as string,
            databaseId: req.get('X-Database-Id') as string,
          });
        } else if (req.get('X-Meta-Schema')) {
          svc = getMetaSchema({
            opts,
            key,
            databaseId: req.get('X-Database-Id') as string,
          });
        }
      }

      if (!svc) {
        res
          .status(404)
          .send(
            errorPage404Message(
              'API service not found. Please provide X-Schemata or X-Meta-Schema header.'
            )
          );
        return;
      }

      const api = transformServiceToApi(svc);
      req.api = api;
      req.databaseId = api.databaseId;
      next();
    } catch (e: any) {
      if (e.code === 'NO_VALID_SCHEMAS') {
        res.status(404).send(errorPage404Message(e.message));
      } else if (e.message.match(/does not exist/)) {
        res
          .status(404)
          .send(
            errorPage404Message(
              "The resource you're looking for does not exist."
            )
          );
      } else {
        console.error(e);
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
  opts: PgpmOptions;
  schemata: string;
  databaseId: string;
  key: string;
}): any => {
  const svc = {
    data: {
      api: {
        databaseId,
        isPublic: false,
        dbname: opts.pg.database,
        anonRole: 'administrator',
        roleName: 'administrator',
        schemaNamesFromExt: {
          nodes: schemata
            .split(',')
            .map((schema) => schema.trim())
            .map((schemaName) => ({ schemaName })),
        },
        schemaNames: { nodes: [] as Array<{ schemaName: string }> },
        apiModules: [] as Array<any>,
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
  opts: PgpmOptions;
  key: string;
  databaseId: string;
}): any => {
  const apiOpts = (opts as any).api || {};
  const schemata = apiOpts.metaSchemas || [];
  const svc = {
    data: {
      api: {
        databaseId,
        isPublic: false,
        dbname: opts.pg.database,
        anonRole: 'administrator',
        roleName: 'administrator',
        schemaNamesFromExt: {
          nodes: schemata.map((schemaName: string) => ({ schemaName })),
        },
        schemaNames: { nodes: [] as Array<{ schemaName: string }> },
        apiModules: [] as Array<any>,
      },
    },
  };
  svcCache.set(key, svc);
  return svc;
};

const getSvcKey = (opts: PgpmOptions, req: Request): string => {
  const apiPublic = (opts as any).api?.isPublic;
  if (apiPublic === false) {
    if (req.get('X-Api-Name')) {
      return 'postgrest:api:' + req.get('X-Database-Id') + ':' + req.get('X-Api-Name');
    }
    if (req.get('X-Schemata')) {
      return (
        'postgrest:schemata:' + req.get('X-Database-Id') + ':' + req.get('X-Schemata')
      );
    }
    if (req.get('X-Meta-Schema')) {
      return 'postgrest:metaschema:api:' + req.get('X-Database-Id');
    }
  }
  return 'postgrest:default';
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
