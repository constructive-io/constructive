import { normalizeError } from '@constructive-io/errors';
import { Logger } from '@pgpmjs/logger';
import { getEnvOptions } from '@constructive-io/graphql-env';
import type { ConstructiveOptions } from '@constructive-io/graphql-types';
import { middleware as parseDomains } from '@constructive-io/url-domains';
import { cors, healthz, poweredBy } from '@pgpmjs/server-utils';
import express, { Express, NextFunction, Request, Response } from 'express';
import {
  clearGraphileEntriesForService,
  configureGraphileAdmission,
  createGraphileBuildCacheKey,
  createGraphileInstance,
  graphileBuildFlights,
  configureGraphileBuilds,
  GraphileCacheEntry,
  referenceGraphileBuildValue,
  snapshotGraphileBuildValue
} from 'graphile-cache';
import type { GraphileConfig } from 'graphile-config';
import { makePgService } from 'graphile-settings';
import { getPgPool } from 'pg-cache';
import { getPgEnvOptions } from 'pg-env';

import { printDatabases, printSchemas } from './render';
import { getGraphilePreset } from './settings';

const log = new Logger('graphql-explorer');
const respondError = (res: Response, error: unknown): void => {
  if ((error as { code?: string })?.code === '3D000') {
    res.status(404).send('Database not found');
    return;
  }
  const failure = normalizeError(error);
  log.error('Explorer request refused', { code: failure.code });
  res.status(failure.http).json({ errors: [{ message: failure.message, extensions: failure.toExtensions() }] });
};

export const GraphQLExplorer = (rawOpts: ConstructiveOptions = {}): Express => {
  const opts = getEnvOptions(rawOpts);
  configureGraphileAdmission(opts.graphile?.cache);
  configureGraphileBuilds(opts.graphile?.build);
  const ownerIdentity = {};

  const { pg, server } = opts;

  const getGraphileInstanceObj = async (
    dbname: string,
    schemaname: string
  ): Promise<GraphileCacheEntry> => {
    const pgConfig = getPgEnvOptions({
      ...pg,
      database: dbname,
    });

    // Route through pg-cache so the pool is tracked and can be cleaned up
    // properly, preventing leaked connections during database teardown.
    const pool = getPgPool(pgConfig);

    const serviceKey = `${dbname}.${schemaname}`;
    const snapshot = snapshotGraphileBuildValue({
      ownerIdentity: referenceGraphileBuildValue(ownerIdentity),
      serviceKey,
      poolIdentity: referenceGraphileBuildValue(pool),
      poolKey: pgConfig.database,
      pgConfig,
      databaseName: dbname,
      databaseId: null,
      apiId: null,
      schemas: [schemaname],
      role: pg.user ?? 'postgres',
      surface: {
        graphqlPath: '/graphql',
        graphiqlPath: '/graphiql',
        graphiql: true,
      },
      explain: undefined,
      enableRealtime: false,
    });
    const key = createGraphileBuildCacheKey('explorer', snapshot);
    return graphileBuildFlights.getOrCreate(
      { cacheKey: key, serviceKey, databaseId: null, poolKey: snapshot.poolKey },
      async () => {
        const basePreset = getGraphilePreset(opts, snapshot.role);
        const preset: GraphileConfig.Preset = {
          ...basePreset,
          pgServices: [makePgService({ pool, schemas: snapshot.schemas })],
          grafserv: snapshot.surface,
        };
        return createGraphileInstance({ preset, cacheKey: key });
      }
    );
  };

  const app = express();

  healthz(app);
  cors(app, server.origin);
  app.use(parseDomains());
  app.use(poweredBy('constructive'));

  app.use(async (req: Request, res: Response, next: NextFunction) => {
    if (req.urlDomains?.subdomains.length === 1) {
      const [dbName] = req.urlDomains.subdomains;
      try {
        const pgPool = getPgPool(
          getPgEnvOptions({
            ...opts.pg,
            database: dbName,
          })
        );

        const results = await pgPool.query(`
          SELECT s.nspname AS table_schema
          FROM pg_catalog.pg_namespace s
          WHERE s.nspname !~ '^pg_' AND s.nspname NOT IN ('information_schema');
        `);
        res.send(
          printSchemas({
            dbName,
            schemas: results.rows,
            req,
            hostname: server.host,
            port: server.port,
          })
        );
        return;
      } catch (e: any) {
        respondError(res, e);
        return;
      }
    }
    return next();
  });

  app.use(async (req: Request, res: Response, next: NextFunction) => {
    if (req.urlDomains?.subdomains.length === 2) {
      const [, dbName] = req.urlDomains.subdomains;
      try {
        const pgPool = getPgPool(
          getPgEnvOptions({
            ...opts.pg,
            database: dbName,
          })
        );

        await pgPool.query('SELECT 1;');
      } catch (e: any) {
        respondError(res, e);
        return;
      }
    }
    return next();
  });

  app.use(async (req: Request, res: Response, next: NextFunction) => {
    if (req.urlDomains?.subdomains.length === 2) {
      const [schemaName, dbName] = req.urlDomains.subdomains;
      try {
        if (req.url === '/flush') {
          clearGraphileEntriesForService(`${dbName}.${schemaName}`);
          res.status(200).send('OK');
          return;
        }
        const instance = await getGraphileInstanceObj(dbName, schemaName);
        instance.handler(req, res, next);
        return;
      } catch (e: any) {
        respondError(res, e);
        return;
      }
    }
    return next();
  });

  app.use(async (req: Request, res: Response, next: NextFunction) => {
    if (req.urlDomains?.subdomains.length === 0) {
      try {
        const rootPgPool = getPgPool(
          getPgEnvOptions({
            ...opts.pg,
            database: opts.pg.user, // is this to get postgres?
          })
        );

        const results = await rootPgPool.query(`
          SELECT * FROM pg_catalog.pg_database
          WHERE datistemplate = FALSE AND datname != 'postgres' AND datname !~ '^pg_'
        `);
        res.send(
          printDatabases({ databases: results.rows, req, port: server.port })
        );
        return;
      } catch (e: any) {
        respondError(res, e);
        return;
      }
    }
    return next();
  });

  app.listen(server.port, server.host, () => {
    console.log(`app listening at http://${server.host}:${server.port}`);
  });

  return app;
};
