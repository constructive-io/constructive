import { createServer } from 'node:http';
import { getEnvOptions } from '@constructive-io/graphql-env';
import type { ConstructiveOptions } from '@constructive-io/graphql-types';
import { cors, healthz, poweredBy } from '@pgpmjs/server-utils';
import { middleware as parseDomains } from '@constructive-io/url-domains';
import express, { Express, NextFunction, Request, Response } from 'express';
import { GraphileCacheEntry, graphileCache } from 'graphile-cache';
import { ConstructivePreset, makePgService } from 'graphile-settings';
import type { GraphileConfig } from 'graphile-config';
import graphqlUpload from 'graphql-upload';
import { postgraphile } from 'postgraphile';
import { grafserv } from 'grafserv/express/v4';
import { getPgPool } from 'pg-cache';
import { getPgEnvOptions } from 'pg-env';

import { printDatabases, printSchemas } from './render';
import { getGraphilePreset } from './settings';

const buildConnectionString = (
  user: string,
  password: string,
  host: string,
  port: string | number,
  database: string
): string => `postgres://${user}:${password}@${host}:${port}/${database}`;

const createGraphileExplorerInstance = async (
  opts: ConstructiveOptions,
  dbname: string,
  schemaname: string,
  cacheKey: string
): Promise<GraphileCacheEntry> => {
  const pgConfig = getPgEnvOptions({
    ...opts.pg,
    database: dbname,
  });
  const connectionString = buildConnectionString(
    pgConfig.user,
    pgConfig.password,
    pgConfig.host,
    pgConfig.port,
    pgConfig.database
  );

  const basePreset = getGraphilePreset(opts);

  const preset: GraphileConfig.Preset = {
    ...basePreset,
    extends: [...(basePreset.extends || [])],
    pgServices: [
      makePgService({
        connectionString,
        schemas: [schemaname],
      }),
    ],
    grafserv: {
      graphqlPath: '/graphql',
      graphiqlPath: '/graphiql',
      graphiql: true,
    },
  };

  const pgl = postgraphile(preset);
  const serv = pgl.createServ(grafserv);

  const handler = express();
  const httpServer = createServer(handler);
  await serv.addTo(handler, httpServer);
  await serv.ready();

  return {
    pgl,
    serv,
    handler,
    httpServer,
    cacheKey,
    createdAt: Date.now(),
  };
};

export const GraphQLExplorer = (rawOpts: ConstructiveOptions = {}): Express => {
  const opts = getEnvOptions(rawOpts);

  const { pg, server } = opts;

  const getGraphileInstanceObj = async (
    dbname: string,
    schemaname: string
  ): Promise<GraphileCacheEntry> => {
    const key = `${dbname}.${schemaname}`;

    const cached = graphileCache.get(key);
    if (cached) {
      return cached;
    }

    const instance = await createGraphileExplorerInstance(
      opts,
      dbname,
      schemaname,
      key
    );

    graphileCache.set(key, instance);
    return instance;
  };

  const app = express();

  healthz(app);
  cors(app, server.origin);
  app.use(parseDomains());
  app.use(poweredBy('constructive'));
  app.use(graphqlUpload.graphqlUploadExpress());

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
        if (e.message?.match(/does not exist/)) {
          res.status(404).send('DB Not found');
          return;
        }
        console.error(e);
        res.status(500).send('Something happened...');
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
        if (e.message?.match(/does not exist/)) {
          res.status(404).send('DB Not found');
          return;
        }
        console.error(e);
        res.status(500).send('Something happened...');
        return;
      }
    }
    return next();
  });

  app.use(async (req: Request, res: Response, next: NextFunction) => {
    if (req.urlDomains?.subdomains.length === 2) {
      const [schemaName, dbName] = req.urlDomains.subdomains;
      try {
        const { handler } = await getGraphileInstanceObj(dbName, schemaName);
        handler(req, res, next);
        return;
      } catch (e: any) {
        res.status(500).send(e.message);
        return;
      }
    }
    return next();
  });

  app.use(async (req: Request, res: Response, next: NextFunction) => {
    if (req.urlDomains?.subdomains.length === 2 && req.url === '/flush') {
      const [schemaName, dbName] = req.urlDomains.subdomains;
      const key = `${dbName}.${schemaName}`;
      graphileCache.delete(key);
      res.status(200).send('OK');
      return;
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
        if (e.message?.match(/does not exist/)) {
          res.status(404).send('DB Not found');
          return;
        }
        console.error(e);
        res.status(500).send('Something happened...');
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
