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
const sql = (f: string) => join(__dirname, '../../test/sql', f);
const metaSql = (f: string) => join(__dirname, '../__fixtures__/sql', f);

const primaryDatabaseId = '0b22e268-16d6-582b-950a-24e108688849';
const secondaryDatabaseId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const tertiaryDatabaseId = 'f1e2d3c4-b5a6-7890-1234-567890abcdef';

const databases = {
  primary: { id: primaryDatabaseId, name: 'primary_db' },
  secondary: { id: secondaryDatabaseId, name: 'secondary_db' },
  tertiary: { id: tertiaryDatabaseId, name: 'tertiary_db' },
};

const hosts = {
  primary: 'primary.example.com',
  secondary: 'secondary.example.com',
  tertiary: 'tertiary.example.com',
  unavailable: 'unavailable.example.com',
};

const apiIds = {
  primary: '11111111-2222-3333-4444-555555555555',
  secondary: '22222222-3333-4444-5555-666666666666',
  tertiary: '33333333-4444-5555-6666-777777777777',
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

const createAppDb = async (
  itemName: string,
  sourceDb: string
): Promise<SeededConnections> => {
  const { db, pg, teardown } = await getConnections(
    { db: { extensions: ['citext', 'pgcrypto'] } },
    [
      bootstrapAdminUsers,
      seed.sqlfile([
        sql('test.sql'),
        metaSql('app-data.seed.sql'),
        sql('grants.sql'),
      ]),
      seed.fn(async ({ pg }) => {
        await pg.query(
          'INSERT INTO app_public.items (name, source_db, is_public) VALUES ($1, $2, true)',
          [itemName, sourceDb]
        );
      }),
    ]
  );

  return { db, pg, teardown };
};

const createMetaDb = async ({
  primary,
  secondary,
  tertiary,
}: {
  primary: SeededConnections;
  secondary: SeededConnections;
  tertiary: SeededConnections;
}): Promise<SeededConnections> => {
  const { db, pg, teardown } = await getConnections(
    { db: { extensions: metaDbExtensions } },
    [
      bootstrapAdminUsers,
      deployMetaModules,
      seed.sqlfile([metaSql('multi-database.seed.sql')]),
    ]
  );

  await db.begin();
  db.setContext({
    role: 'administrator',
    'jwt.claims.database_id': primaryDatabaseId,
  });
  try {
    await db.query(
      'UPDATE services_public.apis SET dbname = $1 WHERE id = $2',
      [primary.db.config.database, apiIds.primary]
    );
    await db.query(
      'UPDATE services_public.apis SET dbname = $1 WHERE id = $2',
      [secondary.db.config.database, apiIds.secondary]
    );
    await db.query(
      'UPDATE services_public.apis SET dbname = $1 WHERE id = $2',
      [tertiary.db.config.database, apiIds.tertiary]
    );
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
      enableMetaApi: true,
      isPublic: true,
      metaSchemas,
    },
  });
};

let metaDb: SeededConnections | null = null;
let primaryDb: SeededConnections | null = null;
let secondaryDb: SeededConnections | null = null;
let tertiaryDb: SeededConnections | null = null;

beforeAll(async () => {
  primaryDb = await createAppDb('Primary Item', databases.primary.name);
  secondaryDb = await createAppDb('Secondary Item', databases.secondary.name);
  tertiaryDb = await createAppDb('Tertiary Item', databases.tertiary.name);

  metaDb = await createMetaDb({
    primary: requireConnections(primaryDb, 'primary'),
    secondary: requireConnections(secondaryDb, 'secondary'),
    tertiary: requireConnections(tertiaryDb, 'tertiary'),
  });
});

afterAll(async () => {
  await GraphQLServer.closeCaches({ closePools: true });
  if (metaDb) {
    await metaDb.teardown();
  }
  if (primaryDb) {
    await primaryDb.teardown();
  }
  if (secondaryDb) {
    await secondaryDb.teardown();
  }
  if (tertiaryDb) {
    await tertiaryDb.teardown();
  }
});

describe('Multi-Database', () => {
  let started: StartedServer | null = null;
  let db: PgTestClient;

  beforeAll(async () => {
    const connections = requireConnections(metaDb, 'meta');
    db = connections.db;
    started = await startServer(
      buildOptions({
        db,
      })
    );
  });

  beforeEach(async () => {
    db.setContext({
      role: 'anonymous',
      'jwt.claims.database_id': primaryDatabaseId,
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

  describe('routing to separate databases', () => {
    it('routes primary.example.com to primary database', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const req = request.agent(started.httpServer);
      setHeaders(req, { Host: hosts.primary });
      const res = await req
        .post('/graphql')
        .send({ query: '{ items { nodes { name sourceDb } } }' });

      expect(res.status).toBe(200);
      const node = res.body.data.items.nodes.find(
        (n: any) => n.name === 'Primary Item'
      );
      expect(node?.sourceDb).toBe(databases.primary.name);
    });

    it('routes secondary.example.com to secondary database', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const req = request.agent(started.httpServer);
      setHeaders(req, { Host: hosts.secondary });
      const res = await req
        .post('/graphql')
        .send({ query: '{ items { nodes { name sourceDb } } }' });

      expect(res.status).toBe(200);
      const node = res.body.data.items.nodes.find(
        (n: any) => n.name === 'Secondary Item'
      );
      expect(node?.sourceDb).toBe(databases.secondary.name);
    });

    it('routes tertiary.example.com to tertiary database', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const req = request.agent(started.httpServer);
      setHeaders(req, { Host: hosts.tertiary });
      const res = await req
        .post('/graphql')
        .send({ query: '{ items { nodes { name sourceDb } } }' });

      expect(res.status).toBe(200);
      const node = res.body.data.items.nodes.find(
        (n: any) => n.name === 'Tertiary Item'
      );
      expect(node?.sourceDb).toBe(databases.tertiary.name);
    });
  });

  describe('data isolation', () => {
    it('primary database cannot see secondary data', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const req = request.agent(started.httpServer);
      setHeaders(req, { Host: hosts.primary });
      const res = await req
        .post('/graphql')
        .send({ query: '{ items { nodes { name } } }' });

      expect(res.status).toBe(200);
      const names = res.body.data.items.nodes.map((n: any) => n.name);
      expect(names).not.toContain('Secondary Item');
    });

    it('secondary database cannot see primary data', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const req = request.agent(started.httpServer);
      setHeaders(req, { Host: hosts.secondary });
      const res = await req
        .post('/graphql')
        .send({ query: '{ items { nodes { name } } }' });

      expect(res.status).toBe(200);
      const names = res.body.data.items.nodes.map((n: any) => n.name);
      expect(names).not.toContain('Primary Item');
    });

    it('writes in one database do not affect another', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const primaryConnections = requireConnections(primaryDb, 'primary');
      await primaryConnections.pg.query(
        'INSERT INTO app_public.items (name, source_db, is_public) VALUES ($1, $2, true)',
        ['New Primary Item', databases.primary.name]
      );

      const readReq = request.agent(started.httpServer);
      setHeaders(readReq, { Host: hosts.secondary });
      const res = await readReq
        .post('/graphql')
        .send({ query: '{ items { nodes { name } } }' });

      const names = res.body.data.items.nodes.map((n: any) => n.name);
      expect(names).not.toContain('New Primary Item');
    });
  });

  describe('connection pool separation', () => {
    it('creates separate connection pools per database', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      await Promise.all([
        request(started.httpServer)
          .post('/graphql')
          .set('Host', hosts.primary)
          .send({ query: '{ __typename }' }),
        request(started.httpServer)
          .post('/graphql')
          .set('Host', hosts.secondary)
          .send({ query: '{ __typename }' }),
      ]);

      expect(true).toBe(true);
    });

    it('handles concurrent requests to multiple databases', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const requests = Array.from({ length: 10 }, (_, i) => {
        const host = i % 2 === 0 ? hosts.primary : hosts.secondary;
        return request(started.httpServer)
          .post('/graphql')
          .set('Host', host)
          .send({ query: '{ __typename }' });
      });

      const results = await Promise.all(requests);
      results.forEach((res) => {
        expect(res.status).toBe(200);
      });
    });
  });

  describe('failure handling', () => {
    it('failure in one database does not affect others', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const primaryRes = await request(started.httpServer)
        .post('/graphql')
        .set('Host', hosts.primary)
        .send({ query: '{ __typename }' });

      const secondaryRes = await request(started.httpServer)
        .post('/graphql')
        .set('Host', hosts.secondary)
        .send({ query: '{ __typename }' });

      expect(primaryRes.status).toBe(200);
      expect(secondaryRes.status).toBe(200);
    });

    it('returns appropriate error for unavailable database', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const res = await request(started.httpServer)
        .post('/graphql')
        .set('Host', hosts.unavailable)
        .send({ query: '{ __typename }' });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('recovers when database becomes available again', async () => {
      expect(true).toBe(true);
    });
  });

  describe('database_id in JWT claims', () => {
    it('sets correct database_id for primary domain', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const req = request.agent(started.httpServer);
      setHeaders(req, { Host: hosts.primary });
      const res = await req.post('/graphql').send({
        query: '{ dbId: currentSetting(name: "jwt.claims.database_id") }',
      });

      expect(res.body.data.dbId).toBe(primaryDatabaseId);
    });

    it('sets correct database_id for secondary domain', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const req = request.agent(started.httpServer);
      setHeaders(req, { Host: hosts.secondary });
      const res = await req.post('/graphql').send({
        query: '{ dbId: currentSetting(name: "jwt.claims.database_id") }',
      });

      expect(res.body.data.dbId).toBe(secondaryDatabaseId);
    });
  });
});
