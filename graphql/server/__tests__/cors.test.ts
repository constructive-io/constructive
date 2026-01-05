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

const createMetaDb = async (): Promise<SeededConnections> => {
  const { db, pg, teardown } = await getConnections(
    { db: { extensions: metaDbExtensions } },
    [
      bootstrapAdminUsers,
      deployMetaModules,
      seed.sqlfile([
        metaSql('domains.seed.sql'),
        metaSql('cors.seed.sql'),
      ]),
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
  origin,
}: {
  db: PgTestClient;
  origin?: string;
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
      ...(origin ? { origin } : {}),
    },
    api: {
      enableMetaApi: true,
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

describe('CORS', () => {
  describe('default config', () => {
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

    describe('preflight requests', () => {
      it('responds to OPTIONS with correct headers', async () => {
        if (!started) {
          throw new Error('HTTP server not started');
        }
        const origin = 'https://allowed.example.com';
        const req = request.agent(started.httpServer);
        setHeaders(req, {
          Host: apiHost,
          Origin: origin,
          'Access-Control-Request-Method': 'POST',
        });
        const res = await req.options('/graphql');

        expect(res.status).toBe(200);
        expect(res.headers['access-control-allow-origin']).toBe(origin);
      });

      it('includes Access-Control-Allow-Methods', async () => {
        if (!started) {
          throw new Error('HTTP server not started');
        }
        const origin = 'https://allowed.example.com';
        const req = request.agent(started.httpServer);
        setHeaders(req, {
          Host: apiHost,
          Origin: origin,
          'Access-Control-Request-Method': 'POST',
        });
        const res = await req.options('/graphql');

        expect(res.headers['access-control-allow-methods']).toContain('POST');
      });

      it('includes Access-Control-Allow-Headers', async () => {
        if (!started) {
          throw new Error('HTTP server not started');
        }
        const origin = 'https://allowed.example.com';
        const req = request.agent(started.httpServer);
        setHeaders(req, {
          Host: apiHost,
          Origin: origin,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type, Authorization',
        });
        const res = await req.options('/graphql');

        expect(res.headers['access-control-allow-headers']).toBeTruthy();
      });
    });

    describe('per-API cors module', () => {
      it('allows origins in cors module urls array', async () => {
        if (!started) {
          throw new Error('HTTP server not started');
        }
        const origin = 'https://allowed.example.com';
        const req = request.agent(started.httpServer);
        setHeaders(req, { Host: apiHost, Origin: origin });
        const res = await req.post('/graphql').send({ query: '{ __typename }' });

        expect(res.headers['access-control-allow-origin']).toBe(origin);
      });

      it('allows origins from api.domains', async () => {
        if (!started) {
          throw new Error('HTTP server not started');
        }
        const origin = 'https://api.example.com';
        const req = request.agent(started.httpServer);
        setHeaders(req, { Host: apiHost, Origin: origin });
        const res = await req.post('/graphql').send({ query: '{ __typename }' });

        expect(res.headers['access-control-allow-origin']).toBe(origin);
      });

      it('blocks origins not in allowlist', async () => {
        if (!started) {
          throw new Error('HTTP server not started');
        }
        const origin = 'https://blocked.example.com';
        const req = request.agent(started.httpServer);
        setHeaders(req, { Host: apiHost, Origin: origin });
        const res = await req.post('/graphql').send({ query: '{ __typename }' });

        expect(res.headers['access-control-allow-origin']).toBeUndefined();
      });
    });

    describe('localhost exception', () => {
      it('always allows localhost origins', async () => {
        if (!started) {
          throw new Error('HTTP server not started');
        }
        const origin = 'http://localhost:3000';
        const req = request.agent(started.httpServer);
        setHeaders(req, { Host: apiHost, Origin: origin });
        const res = await req.post('/graphql').send({ query: '{ __typename }' });

        expect(res.headers['access-control-allow-origin']).toBe(origin);
      });

      it('allows localhost with any port', async () => {
        if (!started) {
          throw new Error('HTTP server not started');
        }
        const origin = 'http://localhost:8080';
        const req = request.agent(started.httpServer);
        setHeaders(req, { Host: apiHost, Origin: origin });
        const res = await req.post('/graphql').send({ query: '{ __typename }' });

        expect(res.headers['access-control-allow-origin']).toBe(origin);
      });

      it('allows localhost over https', async () => {
        if (!started) {
          throw new Error('HTTP server not started');
        }
        const origin = 'https://localhost:3000';
        const req = request.agent(started.httpServer);
        setHeaders(req, { Host: apiHost, Origin: origin });
        const res = await req.post('/graphql').send({ query: '{ __typename }' });

        expect(res.headers['access-control-allow-origin']).toBe(origin);
      });
    });
  });

  describe('global fallback (SERVER_ORIGIN="*")', () => {
    let started: StartedServer | null = null;
    let db: PgTestClient;

    beforeAll(async () => {
      const connections = requireConnections(metaDb, 'meta');
      db = connections.db;
      started = await startServer(
        buildOptions({
          db,
          origin: '*',
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

    it('allows any origin when SERVER_ORIGIN="*"', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const origin = 'https://random.domain.com';
      const req = request.agent(started.httpServer);
      setHeaders(req, { Host: apiHost, Origin: origin });
      const res = await req.post('/graphql').send({ query: '{ __typename }' });

      expect(res.headers['access-control-allow-origin']).toBe(origin);
    });
  });

  describe('global fallback (SERVER_ORIGIN specific)', () => {
    let started: StartedServer | null = null;
    let db: PgTestClient;

    beforeAll(async () => {
      const connections = requireConnections(metaDb, 'meta');
      db = connections.db;
      started = await startServer(
        buildOptions({
          db,
          origin: 'https://specific.com',
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

    it('allows specific origin when SERVER_ORIGIN set', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const origin = 'https://specific.com';
      const req = request.agent(started.httpServer);
      setHeaders(req, { Host: apiHost, Origin: origin });
      const res = await req.post('/graphql').send({ query: '{ __typename }' });

      expect(res.headers['access-control-allow-origin']).toBe(origin);
    });

    it('blocks non-matching origin when SERVER_ORIGIN set', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const origin = 'https://other.com';
      const req = request.agent(started.httpServer);
      setHeaders(req, { Host: apiHost, Origin: origin });
      const res = await req.post('/graphql').send({ query: '{ __typename }' });

      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });
  });
});
