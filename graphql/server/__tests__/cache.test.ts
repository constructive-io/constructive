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

const metaSchemas = ['metaschema_public', 'services_public', 'metaschema_modules_public'];
const metaSql = (f: string) => join(__dirname, '../__fixtures__/sql', f);
// Stable seeded UUID used for JWT claims and meta fixtures; dbname is set dynamically per test DB.
const seededDatabaseId = '0b22e268-16d6-582b-950a-24e108688849';
const apiHost = 'api.example.com';
const appHost = 'app.example.com';

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

const waitForCacheClear = async (
  keys: string[],
  timeoutMs = 1000
): Promise<void> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const allCleared = keys.every(
      (key) => !svcCache.has(key) && !graphileCache.has(key)
    );
    if (allCleared) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('Timed out waiting for cache to clear');
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
  if (!started.httpServer.listening) {
    return;
  }
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

const buildOptions = ({ db }: { db: PgTestClient }): ConstructiveOptions => {
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
    api: {
      enableServicesApi: true,
      isPublic: true,
      metaSchemas,
    },
  });
};

let metaDb: SeededConnections | null = null;

beforeAll(async () => {
  metaDb = await createMetaDb();
});

afterAll(async () => {
  await GraphQLServer.closeCaches({ closePools: true });
  if (metaDb) {
    await metaDb.teardown();
  }
});

describe('Caching', () => {
  let started: StartedServer | null = null;
  let db: PgTestClient;
  let pg: PgTestClient;

  beforeAll(async () => {
    const connections = requireConnections(metaDb, 'meta');
    db = connections.db;
    pg = connections.pg;
    started = await startServer(
      buildOptions({
        db,
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

  it('caches API config after first request', async () => {
    if (!started) {
      throw new Error('HTTP server not started');
    }
    clearCaches();
    const key = apiHost;

    expect(svcCache.has(key)).toBe(false);
    expect(graphileCache.has(key)).toBe(false);

    const req1 = request.agent(started.httpServer);
    setHeaders(req1, { Host: apiHost });
    const res1 = await req1.post('/graphql').send({ query: '{ __typename }' });

    expect(res1.status).toBe(200);
    expect(svcCache.has(key)).toBe(true);
    expect(graphileCache.has(key)).toBe(true);

    const firstEntry = graphileCache.get(key);

    const req2 = request.agent(started.httpServer);
    setHeaders(req2, { Host: apiHost });
    const res2 = await req2.post('/graphql').send({ query: '{ __typename }' });

    expect(res2.status).toBe(200);
    expect(graphileCache.get(key)).toBe(firstEntry);
  });

  it('different domains have separate cache entries', async () => {
    if (!started) {
      throw new Error('HTTP server not started');
    }
    clearCaches();

    const req1 = request.agent(started.httpServer);
    setHeaders(req1, { Host: apiHost });
    const res1 = await req1.post('/graphql').send({ query: '{ __typename }' });

    const req2 = request.agent(started.httpServer);
    setHeaders(req2, { Host: appHost });
    const res2 = await req2.post('/graphql').send({ query: '{ __typename }' });

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(svcCache.has(apiHost)).toBe(true);
    expect(svcCache.has(appHost)).toBe(true);
    expect(graphileCache.has(apiHost)).toBe(true);
    expect(graphileCache.has(appHost)).toBe(true);
  });

  it('POST /flush clears cache for current domain', async () => {
    if (!started) {
      throw new Error('HTTP server not started');
    }
    clearCaches();

    const req1 = request.agent(started.httpServer);
    setHeaders(req1, { Host: apiHost });
    const res1 = await req1.post('/graphql').send({ query: '{ __typename }' });

    expect(res1.status).toBe(200);
    expect(svcCache.has(apiHost)).toBe(true);
    expect(graphileCache.has(apiHost)).toBe(true);

    const flushReq = request.agent(started.httpServer);
    setHeaders(flushReq, { Host: apiHost });
    const flushRes = await flushReq.post('/flush');

    expect(flushRes.status).toBe(200);
    expect(svcCache.has(apiHost)).toBe(false);
    expect(graphileCache.has(apiHost)).toBe(false);
  });

  it('NOTIFY schema:update flushes cache for database_id', async () => {
    if (!started) {
      throw new Error('HTTP server not started');
    }
    clearCaches();

    const req = request.agent(started.httpServer);
    setHeaders(req, { Host: apiHost });
    const res = await req.post('/graphql').send({ query: '{ __typename }' });

    expect(res.status).toBe(200);
    expect(svcCache.has(apiHost)).toBe(true);
    expect(graphileCache.has(apiHost)).toBe(true);

    await pg.query(`NOTIFY "schema:update", '${seededDatabaseId}'`);
    await waitForCacheClear([apiHost]);

    expect(svcCache.has(apiHost)).toBe(false);
    expect(graphileCache.has(apiHost)).toBe(false);
  });

  it('Server.closeCaches() clears all cached entries', async () => {
    if (!started) {
      throw new Error('HTTP server not started');
    }
    clearCaches();

    const req = request.agent(started.httpServer);
    setHeaders(req, { Host: apiHost });
    const res = await req.post('/graphql').send({ query: '{ __typename }' });

    expect(res.status).toBe(200);
    expect(svcCache.has(apiHost)).toBe(true);
    expect(graphileCache.has(apiHost)).toBe(true);

    await GraphQLServer.closeCaches();

    expect(svcCache.has(apiHost)).toBe(false);
    expect(graphileCache.has(apiHost)).toBe(false);

    const req2 = request.agent(started.httpServer);
    setHeaders(req2, { Host: apiHost });
    const res2 = await req2.post('/graphql').send({ query: '{ __typename }' });

    expect(res2.status).toBe(200);
  });
});
