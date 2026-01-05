process.env.LOG_SCOPE = 'graphile-test';

import { dirname, join } from 'path';
import type { Server as HttpServer } from 'http';
import request from 'supertest';
import { getEnvOptions } from '@constructive-io/graphql-env';
import type { ConstructiveOptions } from '@constructive-io/graphql-types';
import { PgpmInit, PgpmMigrate } from '@pgpmjs/core';
import { svcCache } from '@pgpmjs/server-utils';
import { graphileCache } from 'graphile-cache';
import { seed, getConnections } from 'pgsql-test';
import { Server as GraphQLServer } from '../src/server';

jest.setTimeout(30000);

const appSchemas = ['app_public'];
const metaSchemas = ['metaschema_public', 'services_public', 'metaschema_modules_public'];
const sql = (f: string) => join(__dirname, '../../test/sql', f);
const metaSql = (f: string) => join(__dirname, '../__fixtures__/sql', f);
// Stable seeded UUID used for JWT claims and meta fixtures; dbname is set dynamically per test DB.
const seededDatabaseId = '0b22e268-16d6-582b-950a-24e108688849';

const domains = {
  publicApi: 'api.example.com',
  publicApp: 'app.example.com',
  privateAdmin: 'admin.example.com',
  unknown: 'unknown.example.com',
  withWww: 'www.example.com',
  withPort: 'api.example.com:3000',
};

const metaDbExtensions = ['citext', 'uuid-ossp', 'unaccent', 'pgcrypto', 'hstore'];

const getPgpmModulePath = (pkgName: string): string =>
  dirname(require.resolve(`${pkgName}/pgpm.plan`));

const metaSeedModules = [
  getPgpmModulePath('@pgpm/verify'),
  getPgpmModulePath('@pgpm/types'),
  getPgpmModulePath('@pgpm/inflection'),
  getPgpmModulePath('@pgpm/database-jobs'),
  getPgpmModulePath('@pgpm/metaschema-schema'),
  getPgpmModulePath('@pgpm/services'),
  getPgpmModulePath('@pgpm/metaschema-modules'),
];

type PgsqlConnections = Awaited<ReturnType<typeof getConnections>>;
type PgTestClient = PgsqlConnections['db'];
type SeededConnections = Pick<PgsqlConnections, 'db' | 'pg' | 'teardown'>;

const bootstrapAdminUsers = seed.fn(async ({ admin, config, connect }) => {
  const roles = connect?.roles;
  const connections = connect?.connections;

  if (!roles || !connections) {
    throw new Error('Missing pgpm role or connection defaults for admin users.');
  }

  const init = new PgpmInit(config);
  try {
    await init.bootstrapRoles(roles);
    await init.bootstrapTestRoles(roles, connections);
  } finally {
    await init.close();
  }

  const appUser = connections.app?.user;
  if (appUser) {
    await admin.grantRole(roles.administrator, appUser, config.database);
  }
});

const deployMetaModules = seed.fn(async ({ config }) => {
  const migrator = new PgpmMigrate(config);
  for (const modulePath of metaSeedModules) {
    const result = await migrator.deploy({ modulePath, usePlan: true });
    if (result.failed) {
      throw new Error(`Failed to deploy ${modulePath}: ${result.failed}`);
    }
  }
});

const requireConnections = (
  connections: SeededConnections | null,
  label: string
): SeededConnections => {
  if (!connections) {
    throw new Error(`${label} connections not initialized`);
  }
  return connections;
};

const setHeaders = <T extends { set: (field: string, value: string) => T }>(
  req: T,
  headers?: Record<string, string>
): T => {
  if (!headers) return req;
  for (const [key, value] of Object.entries(headers)) {
    req.set(key, value);
  }
  return req;
};

type StartedServer = {
  server: GraphQLServer;
  httpServer: HttpServer;
};

const clearCaches = (): void => {
  svcCache.clear();
  graphileCache.clear();
};

const startServer = async (
  opts: ConstructiveOptions
): Promise<StartedServer> => {
  const server = new GraphQLServer(opts);
  server.addEventListener();

  const httpServer = server.listen();
  if (!httpServer.listening) {
    await new Promise<void>((resolve) => {
      httpServer.once('listening', () => resolve());
    });
  }

  return { server, httpServer };
};

const stopServer = async (started: StartedServer | null): Promise<void> => {
  if (!started) return;

  await started.server.close();
  await new Promise<void>((resolve, reject) => {
    started.httpServer.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
};

const createAppDb = async (): Promise<SeededConnections> => {
  const { db, pg, teardown } = await getConnections(
    {},
    [
      bootstrapAdminUsers,
      seed.sqlfile([
        sql('test.sql'),
        sql('grants.sql'),
      ]),
    ]
  );

  return { db, pg, teardown };
};

const createMetaDb = async (): Promise<SeededConnections> => {
  const { db, pg, teardown } = await getConnections(
    { db: { extensions: metaDbExtensions } },
    [
      bootstrapAdminUsers,
      deployMetaModules,
      seed.sqlfile([metaSql('domains.seed.sql')]),
    ]
  );

  await db.begin();
  db.setContext({
    role: 'administrator',
    'jwt.claims.database_id': seededDatabaseId,
  });
  try {
    await db.query('UPDATE services_public.apis SET dbname = current_database()');
    await db.commit();
  } catch (error) {
    await db.client.query('ROLLBACK;');
    throw error;
  } finally {
    db.clearContext();
  }

  return { db, pg, teardown };
};

const buildOptions = ({
  db,
  enableMetaApi,
  isPublic,
}: {
  db: PgTestClient;
  enableMetaApi: boolean;
  isPublic: boolean;
}): ConstructiveOptions => {
  const api = enableMetaApi
    ? {
        enableMetaApi: true,
        isPublic,
        metaSchemas,
      }
    : {
        enableMetaApi: false,
        isPublic,
        exposedSchemas: appSchemas,
        defaultDatabaseId: seededDatabaseId,
      };

  return getEnvOptions({
    pg: {
      host: db.config.host,
      port: db.config.port,
      user: db.config.user,
      password: db.config.password,
      database: db.config.database,
    },
    server: {
      host: '127.0.0.1',
      port: 0,
    },
    api,
  });
};

let metaDb: SeededConnections | null = null;
let appDb: SeededConnections | null = null;

beforeAll(async () => {
  appDb = await createAppDb();
  metaDb = await createMetaDb();
});

afterAll(async () => {
  await GraphQLServer.closeCaches({ closePools: true });
  if (metaDb) {
    await metaDb.teardown();
  }
  if (appDb) {
    await appDb.teardown();
  }
});

describe('Domain Routing', () => {
  describe('meta enabled, isPublic=true', () => {
    let started: StartedServer | null = null;
    let db: PgTestClient;

    beforeAll(async () => {
      const connections = requireConnections(metaDb, 'meta');
      db = connections.db;
      started = await startServer(
        buildOptions({
          db,
          enableMetaApi: true,
          isPublic: true,
        })
      );
    });

    beforeEach(async () => {
      db.setContext({
        role: 'anonymous',
        'jwt.claims.database_id': seededDatabaseId,
      });
      await db.beforeEach();
    });

    afterEach(async () => {
      await db.afterEach();
    });

    afterAll(async () => {
      await stopServer(started);
      started = null;
      clearCaches();
    });

    it('routes api.example.com to public API', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const req = request.agent(started.httpServer);
      setHeaders(req, { Host: domains.publicApi });
      const res = await req.post('/graphql').send({ query: '{ __typename }' });

      expect(res.status).toBe(200);
      expect(res.body.data.__typename).toBe('Query');
    });

    it('routes app.example.com to different public API', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const req = request.agent(started.httpServer);
      setHeaders(req, { Host: domains.publicApp });
      const res = await req.post('/graphql').send({ query: '{ __typename }' });

      expect(res.status).toBe(200);
      expect(res.body.data.__typename).toBe('Query');
    });

    it('rejects requests to domains with is_public=false APIs', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const req = request.agent(started.httpServer);
      setHeaders(req, { Host: domains.privateAdmin });
      const res = await req.post('/graphql').send({ query: '{ __typename }' });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('returns error for unknown domains', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const req = request.agent(started.httpServer);
      setHeaders(req, { Host: domains.unknown });
      const res = await req.post('/graphql').send({ query: '{ __typename }' });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('handles www subdomain (maps to same API as configured)', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const req = request.agent(started.httpServer);
      setHeaders(req, { Host: domains.withWww });
      const res = await req.post('/graphql').send({ query: '{ __typename }' });

      expect(res.status).toBe(200);
      expect(res.body.data.__typename).toBe('Query');
    });

    it('handles port in Host header', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const req = request.agent(started.httpServer);
      setHeaders(req, { Host: domains.withPort });
      const res = await req.post('/graphql').send({ query: '{ __typename }' });

      expect(res.status).toBe(200);
      expect(res.body.data.__typename).toBe('Query');
    });
  });

  describe('meta enabled, isPublic=false', () => {
    let started: StartedServer | null = null;
    let db: PgTestClient;

    beforeAll(async () => {
      const connections = requireConnections(metaDb, 'meta');
      db = connections.db;
      started = await startServer(
        buildOptions({
          db,
          enableMetaApi: true,
          isPublic: false,
        })
      );
    });

    beforeEach(async () => {
      db.setContext({
        role: 'administrator',
        'jwt.claims.database_id': seededDatabaseId,
      });
      await db.beforeEach();
    });

    afterEach(async () => {
      await db.afterEach();
    });

    afterAll(async () => {
      await stopServer(started);
      started = null;
      clearCaches();
    });

    it('routes admin.example.com to private API', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const req = request.agent(started.httpServer);
      setHeaders(req, { Host: domains.privateAdmin });
      const res = await req.post('/graphql').send({ query: '{ __typename }' });

      expect(res.status).toBe(200);
      expect(res.body.data.__typename).toBe('Query');
    });

    it('rejects requests to domains with is_public=true APIs', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const req = request.agent(started.httpServer);
      setHeaders(req, { Host: domains.publicApi });
      const res = await req.post('/graphql').send({ query: '{ __typename }' });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('meta disabled', () => {
    let started: StartedServer | null = null;
    let db: PgTestClient;

    beforeAll(async () => {
      const connections = requireConnections(appDb, 'app');
      db = connections.db;
      started = await startServer(
        buildOptions({
          db,
          enableMetaApi: false,
          isPublic: true,
        })
      );
    });

    beforeEach(async () => {
      db.setContext({
        role: 'administrator',
        'jwt.claims.database_id': seededDatabaseId,
      });
      await db.beforeEach();
    });

    afterEach(async () => {
      await db.afterEach();
    });

    afterAll(async () => {
      await stopServer(started);
      started = null;
      clearCaches();
    });

    it('ignores Host header, uses static config', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const req = request.agent(started.httpServer);
      setHeaders(req, { Host: 'any.domain.com' });
      const res = await req.post('/graphql').send({ query: '{ __typename }' });

      expect(res.status).toBe(200);
      expect(res.body.data.__typename).toBe('Query');
    });

    it('serves exposedSchemas regardless of domain', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const req1 = request.agent(started.httpServer);
      setHeaders(req1, { Host: 'foo.com' });
      const res1 = await req1.post('/graphql').send({ query: '{ __typename }' });

      const req2 = request.agent(started.httpServer);
      setHeaders(req2, { Host: 'bar.com' });
      const res2 = await req2.post('/graphql').send({ query: '{ __typename }' });

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      expect(res1.body.data.__typename).toBe('Query');
      expect(res2.body.data.__typename).toBe('Query');
    });
  });
});
