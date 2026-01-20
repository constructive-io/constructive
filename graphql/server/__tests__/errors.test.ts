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
// Stable seeded UUID used for JWT claims and meta fixtures; dbname is set dynamically per test DB.
const seededDatabaseId = '0b22e268-16d6-582b-950a-24e108688849';
const apiHost = 'api.example.com';
const unknownHost = 'nonexistent.domain.com';

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
      seed.sqlfile([
        metaSql('domains.seed.sql'),
        metaSql('auth.seed.sql'),
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

const createAppDb = async (): Promise<SeededConnections> => {
  const { db, pg, teardown } = await getConnections(
    { db: { extensions: ['citext', 'pgcrypto'] } },
    [
      bootstrapAdminUsers,
      seed.sqlfile([
        sql('test.sql'),
        metaSql('internal_error.sql'),
        sql('grants.sql'),
      ]),
    ]
  );

  return { db, pg, teardown };
};

const buildOptions = ({
  db,
  metaSchemasOverride,
}: {
  db: PgTestClient;
  metaSchemasOverride?: string[];
}): ConstructiveOptions => {
  const options = getEnvOptions({
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
    },
  });
  options.api.metaSchemas = metaSchemasOverride ?? metaSchemas;
  return options;
};

const buildAppOptions = ({
  db,
}: {
  db: PgTestClient;
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
    },
    api: {
      enableServicesApi: false,
      isPublic: true,
      exposedSchemas: ['app_public'],
      defaultDatabaseId: seededDatabaseId,
      anonRole: 'anonymous',
      roleName: 'authenticated',
    },
  });
};

const buildUnreachableOptions = (): ConstructiveOptions => {
  return getEnvOptions({
    pg: {
      host: '127.0.0.1',
      port: 5999,
      user: 'invalid',
      password: 'invalid',
      database: 'missing_db',
    },
    server: {
      host: '127.0.0.1',
      port: 0,
    },
    api: {
      enableServicesApi: false,
      isPublic: true,
      exposedSchemas: ['app_public'],
      defaultDatabaseId: seededDatabaseId,
      anonRole: 'anonymous',
      roleName: 'authenticated',
    },
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

describe('Error Handling', () => {
  describe('meta-enabled server errors', () => {
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

    describe('routing errors', () => {
      it('returns 404 or error for unknown domain', async () => {
        if (!started) {
          throw new Error('HTTP server not started');
        }
        const req = request.agent(started.httpServer);
        setHeaders(req, { Host: unknownHost });
        const res = await req.post('/graphql').send({ query: '{ __typename }' });

        expect(res.status).toBeGreaterThanOrEqual(400);
      });

      it('GET / returns 404', async () => {
        if (!started) {
          throw new Error('HTTP server not started');
        }
        const res = await request(started.httpServer).get('/');
        expect(res.status).toBe(404);
      });

      it('GET /unknown-path returns 404', async () => {
        if (!started) {
          throw new Error('HTTP server not started');
        }
        const res = await request(started.httpServer).get('/unknown-path');
        expect(res.status).toBe(404);
      });
    });

    describe('GraphQL errors', () => {
      it('returns errors array for query syntax errors', async () => {
        if (!started) {
          throw new Error('HTTP server not started');
        }
        const req = request.agent(started.httpServer);
        setHeaders(req, { Host: apiHost });
        const res = await req
          .post('/graphql')
          .send({ query: '{ invalid syntax here' });

        expect(res.body.errors).toBeDefined();
        expect(res.body.errors.length).toBeGreaterThan(0);
      });

      it('returns errors array for invalid field', async () => {
        if (!started) {
          throw new Error('HTTP server not started');
        }
        const req = request.agent(started.httpServer);
        setHeaders(req, { Host: apiHost });
        const res = await req
          .post('/graphql')
          .send({ query: '{ nonExistentField }' });

        expect(res.body.errors).toBeDefined();
      });

      it('includes error extensions', async () => {
        if (!started) {
          throw new Error('HTTP server not started');
        }
        const req = request.agent(started.httpServer);
        setHeaders(req, {
          Host: apiHost,
          Authorization: 'Bearer invalid-token',
        });
        const res = await req
          .post('/graphql')
          .send({ query: '{ __typename }' });

        expect(res.body.errors?.[0]).toHaveProperty('extensions');
      });
    });

    describe('request errors', () => {
      it('POST /graphql with invalid JSON returns 400', async () => {
        if (!started) {
          throw new Error('HTTP server not started');
        }
        const req = request.agent(started.httpServer);
        setHeaders(req, {
          Host: apiHost,
          'Content-Type': 'application/json',
        });
        const res = await req.post('/graphql').send('{ invalid json }');

        expect(res.status).toBe(400);
      });

      it('POST /graphql without query returns error', async () => {
        if (!started) {
          throw new Error('HTTP server not started');
        }
        const req = request.agent(started.httpServer);
        setHeaders(req, { Host: apiHost });
        const res = await req.post('/graphql').send({});

        expect(res.status).toBeGreaterThanOrEqual(400);
      });
    });
  });

  describe('app database errors', () => {
    let started: StartedServer | null = null;
    let db: PgTestClient;

    beforeAll(async () => {
      const connections = requireConnections(appDb, 'app');
      db = connections.db;
      started = await startServer(
        buildAppOptions({
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

    it('returns 500 for internal database errors', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const req = request.agent(started.httpServer);
      const res = await req.post('/graphql').send({
        query: '{ triggerInternalError }',
      });

      expect(res.status).toBeGreaterThanOrEqual(500);
    });
  });

  describe('database unreachable', () => {
    let started: StartedServer | null = null;

    beforeAll(async () => {
      started = await startServer(buildUnreachableOptions());
    });

    afterAll(async () => {
      await stopServer(started);
      started = null;
      clearCaches();
    });

    it('returns 503 when database is unreachable', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const req = request.agent(started.httpServer);
      const res = await req.post('/graphql').send({ query: '{ __typename }' });

      expect(res.status).toBe(503);
      expect(res.text).toContain('Database unavailable');
    });
  });
});
