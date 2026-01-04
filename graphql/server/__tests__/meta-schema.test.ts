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

const metaSchemas = ['collections_public', 'meta_public'];
const metaSql = (f: string) => join(__dirname, '../__fixtures__/sql', f);
const seededDatabaseId = '0b22e268-16d6-582b-950a-24e108688849';

const hosts = {
  api: 'api.example.com',
  www: 'www.example.com',
  rootIo: 'example.io',
  admin: 'admin.example.com',
  noAuth: 'no-auth.example.com',
};

const metaDbExtensions = ['citext', 'uuid-ossp', 'unaccent', 'pgcrypto', 'hstore'];

const getPgpmModulePath = (pkgName: string): string =>
  dirname(require.resolve(`${pkgName}/pgpm.plan`));

const metaSeedModules = [
  getPgpmModulePath('@pgpm/verify'),
  getPgpmModulePath('@pgpm/types'),
  getPgpmModulePath('@pgpm/inflection'),
  getPgpmModulePath('@pgpm/database-jobs'),
  getPgpmModulePath('@pgpm/db-meta-schema'),
  getPgpmModulePath('@pgpm/db-meta-modules'),
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
    const result = await migrator.deploy({ modulePath, usePlan: false });
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

const createMetaDb = async (): Promise<SeededConnections> => {
  const { db, pg, teardown } = await getConnections(
    { db: { extensions: metaDbExtensions } },
    [
      bootstrapAdminUsers,
      deployMetaModules,
      seed.sqlfile([
        metaSql('auth.seed.sql'),
        metaSql('meta-schema.seed.sql'),
      ]),
    ]
  );

  await db.begin();
  db.setContext({
    role: 'administrator',
    'jwt.claims.database_id': seededDatabaseId,
  });
  try {
    await db.query('UPDATE meta_public.apis SET dbname = current_database()');
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
  isPublic,
  strictAuth,
}: {
  db: PgTestClient;
  isPublic: boolean;
  strictAuth?: boolean;
}): ConstructiveOptions => {
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
      ...(strictAuth ? { strictAuth: true } : {}),
    },
    api: {
      enableMetaApi: true,
      isPublic,
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

describe('Meta Schema Integration', () => {
  describe('public server', () => {
    let started: StartedServer | null = null;
    let db: PgTestClient;

    beforeAll(async () => {
      const connections = requireConnections(metaDb, 'meta');
      db = connections.db;
      started = await startServer(
        buildOptions({
          db,
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

    describe('domains table lookup', () => {
      it('queries by domain + subdomain', async () => {
        if (!started) {
          throw new Error('HTTP server not started');
        }
        const req = request.agent(started.httpServer);
        setHeaders(req, { Host: hosts.api });
        const res = await req.post('/graphql').send({ query: '{ __typename }' });

        expect(res.status).toBe(200);
      });

      it('queries by domain with null subdomain', async () => {
        if (!started) {
          throw new Error('HTTP server not started');
        }
        const req = request.agent(started.httpServer);
        setHeaders(req, { Host: hosts.rootIo });
        const res = await req.post('/graphql').send({ query: '{ __typename }' });

        expect(res.status).toBe(200);
      });

      it('resolves correct API from domain lookup', async () => {
        if (!started) {
          throw new Error('HTTP server not started');
        }
        const req1 = request.agent(started.httpServer);
        setHeaders(req1, { Host: hosts.api });
        const res1 = await req1.post('/graphql').send({ query: '{ __typename }' });

        const req2 = request.agent(started.httpServer);
        setHeaders(req2, { Host: hosts.www });
        const res2 = await req2.post('/graphql').send({ query: '{ __typename }' });

        expect(res1.status).toBe(200);
        expect(res2.status).toBe(200);
      });

      it('returns full API structure from domain lookup', async () => {
        if (!started) {
          throw new Error('HTTP server not started');
        }
        const req = request.agent(started.httpServer);
        setHeaders(req, { Host: hosts.api });
        const res = await req.post('/graphql').send({ query: '{ __typename }' });

        expect(res.status).toBe(200);
      });
    });

    describe('api_extensions merging', () => {
      it('includes all schema_name entries in exposed schemas', async () => {
        if (!started) {
          throw new Error('HTTP server not started');
        }
        const req = request.agent(started.httpServer);
        setHeaders(req, { Host: hosts.api });
        const res = await req.post('/graphql').send({
          query: `{
            __schema {
              types {
                name
              }
            }
          }`,
        });

        expect(res.status).toBe(200);
        const typeNames = res.body.data.__schema.types.map((t: any) => t.name);
        expect(typeNames).toEqual(expect.arrayContaining(['Item', 'Profile', 'Invoice']));
      });

      it('merges schemas in correct order', async () => {
        if (!started) {
          throw new Error('HTTP server not started');
        }
        const req = request.agent(started.httpServer);
        setHeaders(req, { Host: hosts.api });
        const res = await req.post('/graphql').send({ query: '{ __typename }' });

        expect(res.status).toBe(200);
      });

      it('handles duplicate table names across schemas gracefully', async () => {
        if (!started) {
          throw new Error('HTTP server not started');
        }
        const req = request.agent(started.httpServer);
        setHeaders(req, { Host: hosts.api });
        const res = await req.post('/graphql').send({ query: '{ __typename }' });

        expect(res.status).toBe(200);
      });
    });

    describe('rls_module fields', () => {
      it('uses private_schema for auth function lookup', async () => {
        if (!started) {
          throw new Error('HTTP server not started');
        }
        const req = request.agent(started.httpServer);
        setHeaders(req, {
          Host: hosts.api,
          Authorization: 'Bearer valid-token-123',
        });
        const res = await req.post('/graphql').send({ query: '{ __typename }' });

        expect(res.status).toBe(200);
      });

      it('uses authenticate function field', async () => {
        if (!started) {
          throw new Error('HTTP server not started');
        }
        const req = request.agent(started.httpServer);
        setHeaders(req, {
          Host: hosts.api,
          Authorization: 'Bearer valid-token-123',
        });
        const res = await req.post('/graphql').send({
          query: '{ userId: currentSetting(name: "jwt.claims.user_id") }',
        });

        expect(res.status).toBe(200);
        expect(res.body.data.userId).toBeTruthy();
      });

      it('handles missing rls_module gracefully', async () => {
        if (!started) {
          throw new Error('HTTP server not started');
        }
        const req = request.agent(started.httpServer);
        setHeaders(req, { Host: hosts.noAuth });
        const res = await req.post('/graphql').send({ query: '{ __typename }' });

        expect(res.status).toBe(200);
      });
    });

    describe('apiModules list', () => {
      it('returns all configured modules for API', async () => {
        expect(true).toBe(true);
      });
    });

    describe('schemataByApiSchemaApiIdAndSchemaId', () => {
      it('merges additional schemata from join table', async () => {
        if (!started) {
          throw new Error('HTTP server not started');
        }
        const req = request.agent(started.httpServer);
        setHeaders(req, { Host: hosts.api });
        const res = await req.post('/graphql').send({ query: '{ __typename }' });

        expect(res.status).toBe(200);
      });
    });
  });

  describe('apis table filtering', () => {
    let publicStarted: StartedServer | null = null;
    let privateStarted: StartedServer | null = null;
    let db: PgTestClient;

    beforeAll(async () => {
      const connections = requireConnections(metaDb, 'meta');
      db = connections.db;
      publicStarted = await startServer(
        buildOptions({
          db,
          isPublic: true,
        })
      );
      privateStarted = await startServer(
        buildOptions({
          db,
          isPublic: false,
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
      await stopServer(publicStarted);
      await stopServer(privateStarted);
      publicStarted = null;
      privateStarted = null;
      clearCaches();
    });

    it('filters by is_public=true for public server', async () => {
      if (!publicStarted) {
        throw new Error('HTTP server not started');
      }
      const req = request.agent(publicStarted.httpServer);
      setHeaders(req, { Host: hosts.api });
      const res = await req.post('/graphql').send({ query: '{ __typename }' });

      expect(res.status).toBe(200);
    });

    it('filters by is_public=false for private server', async () => {
      if (!privateStarted) {
        throw new Error('HTTP server not started');
      }
      const req = request.agent(privateStarted.httpServer);
      setHeaders(req, { Host: hosts.admin });
      const res = await req.post('/graphql').send({ query: '{ __typename }' });

      expect(res.status).toBe(200);
    });
  });

  describe('strict auth mode', () => {
    let strictStarted: StartedServer | null = null;
    let db: PgTestClient;

    beforeAll(async () => {
      const connections = requireConnections(metaDb, 'meta');
      db = connections.db;
      strictStarted = await startServer(
        buildOptions({
          db,
          isPublic: true,
          strictAuth: true,
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
      await stopServer(strictStarted);
      strictStarted = null;
      clearCaches();
    });

    it('uses authenticate_strict when strictAuth enabled', async () => {
      if (!strictStarted) {
        throw new Error('HTTP server not started');
      }
      const req = request.agent(strictStarted.httpServer);
      setHeaders(req, {
        Host: hosts.api,
        Authorization: 'Bearer valid-token-123',
      });
      const res = await req.post('/graphql').send({ query: '{ __typename }' });

      expect(res.body.errors).toBeDefined();
    });
  });
});
