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

const clearCaches = (): void => {
  svcCache.clear();
  graphileCache.clear();
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

const buildOptions = ({
  db,
  strictAuth,
}: {
  db: PgTestClient;
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

describe('Authentication', () => {
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

  describe('Bearer token auth', () => {
    it('sets jwt.claims.user_id on valid token', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const req = request.agent(started.httpServer);
      setHeaders(req, {
        Host: 'api.example.com',
        Authorization: 'Bearer valid-token-123',
      });
      const res = await req.post('/graphql').send({
        query: '{ userId: currentSetting(name: "jwt.claims.user_id") }',
      });

      expect(res.status).toBe(200);
      expect(res.body.data.userId).toBe('11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    });

    it('sets jwt.claims.token_id on valid token', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const req = request.agent(started.httpServer);
      setHeaders(req, {
        Host: 'api.example.com',
        Authorization: 'Bearer valid-token-123',
      });
      const res = await req.post('/graphql').send({
        query: '{ tokenId: currentSetting(name: "jwt.claims.token_id") }',
      });

      expect(res.status).toBe(200);
      expect(res.body.data.tokenId).toBe('aaaaaaaa-1111-1111-1111-111111111111');
    });

    it('sets jwt.claims.database_id', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const req = request.agent(started.httpServer);
      setHeaders(req, {
        Host: 'api.example.com',
        Authorization: 'Bearer valid-token-123',
      });
      const res = await req.post('/graphql').send({
        query: '{ dbId: currentSetting(name: "jwt.claims.database_id") }',
      });

      expect(res.status).toBe(200);
      expect(res.body.data.dbId).toBe(seededDatabaseId);
    });

    it('sets jwt.claims.ip_address', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const req = request.agent(started.httpServer);
      setHeaders(req, {
        Host: 'api.example.com',
        Authorization: 'Bearer valid-token-123',
      });
      const res = await req.post('/graphql').send({
        query: '{ ip: currentSetting(name: "jwt.claims.ip_address") }',
      });

      expect(res.status).toBe(200);
      expect(res.body.data.ip).toBeTruthy();
    });

    it('returns UNAUTHENTICATED for invalid token', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const req = request.agent(started.httpServer);
      setHeaders(req, {
        Host: 'api.example.com',
        Authorization: 'Bearer invalid-token-xyz',
      });
      const res = await req.post('/graphql').send({ query: '{ __typename }' });

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    });

    it('returns UNAUTHENTICATED for expired token', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const req = request.agent(started.httpServer);
      setHeaders(req, {
        Host: 'api.example.com',
        Authorization: 'Bearer expired-token',
      });
      const res = await req.post('/graphql').send({ query: '{ __typename }' });

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    });

    it('handles malformed Authorization header', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const req = request.agent(started.httpServer);
      setHeaders(req, {
        Host: 'api.example.com',
        Authorization: 'NotBearer token',
      });
      const res = await req.post('/graphql').send({ query: '{ __typename }' });

      expect(res.status).toBe(200);
    });
  });

  describe('Anonymous access', () => {
    it('uses anonRole from API config', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const req = request.agent(started.httpServer);
      setHeaders(req, { Host: 'api.example.com' });
      const res = await req.post('/graphql').send({
        query: '{ role: currentSetting(name: "role") }',
      });

      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe('anonymous');
    });

    it('sets jwt.claims.database_id even without auth', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const req = request.agent(started.httpServer);
      setHeaders(req, { Host: 'api.example.com' });
      const res = await req.post('/graphql').send({
        query: '{ dbId: currentSetting(name: "jwt.claims.database_id") }',
      });

      expect(res.status).toBe(200);
      expect(res.body.data.dbId).toBe(seededDatabaseId);
    });

    it('sets jwt.claims.ip_address even without auth', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const req = request.agent(started.httpServer);
      setHeaders(req, { Host: 'api.example.com' });
      const res = await req.post('/graphql').send({
        query: '{ ip: currentSetting(name: "jwt.claims.ip_address") }',
      });

      expect(res.status).toBe(200);
      expect(res.body.data.ip).toBeTruthy();
    });
  });
});

describe('Authentication (Strict Mode)', () => {
  let strictStarted: StartedServer | null = null;
  let db: PgTestClient;

  beforeAll(async () => {
    const connections = requireConnections(metaDb, 'meta');
    db = connections.db;
    strictStarted = await startServer(
      buildOptions({
        db: connections.db,
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

  it('uses authenticateStrict function when enabled', async () => {
    if (!strictStarted) {
      throw new Error('HTTP server not started');
    }
    const req = request.agent(strictStarted.httpServer);
    setHeaders(req, {
      Host: 'api.example.com',
      Authorization: 'Bearer valid-token-123',
    });
    const res = await req.post('/graphql').send({ query: '{ __typename }' });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
  });
});
