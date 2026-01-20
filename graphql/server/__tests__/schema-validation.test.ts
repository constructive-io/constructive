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
const seededDatabaseId = '0b22e268-16d6-582b-950a-24e108688849';

const hosts = {
  valid: 'api.example.com',
  partial: 'partial.example.com',
  novalid: 'novalid.example.com',
  empty: 'empty.example.com',
};

const authHeaders = {
  Authorization: 'Bearer valid-token-123',
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
        metaSql('auth.seed.sql'),
        metaSql('meta-schema.seed.sql'),
        metaSql('schema-validation.seed.sql'),
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
  metaSchemasOverride,
  featuresOverride,
}: {
  db: PgTestClient;
  metaSchemasOverride?: string[];
  featuresOverride?: ConstructiveOptions['features'];
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
    ...(featuresOverride ? { features: featuresOverride } : {}),
  });
  options.api.metaSchemas = metaSchemasOverride ?? metaSchemas;
  return options;
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

describe('Schema Validation', () => {
  describe('metaSchemas validation', () => {
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

    it('accepts valid metaSchemas configuration', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const req = request.agent(started.httpServer);
      setHeaders(req, { Host: hosts.valid });
      const res = await req.post('/graphql').send({ query: '{ __typename }' });

      expect(res.status).toBe(200);
    });
  });

  describe('schema building edge cases', () => {
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

    it('skips invalid schemas with warning', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const req = request.agent(started.httpServer);
      setHeaders(req, { Host: hosts.partial });
      const res = await req.post('/graphql').send({ query: '{ __typename }' });

      expect(res.status).toBe(200);
    });

    it('fails if no valid schemas available', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const req = request.agent(started.httpServer);
      setHeaders(req, { Host: hosts.novalid });
      const res = await req.post('/graphql').send({ query: '{ __typename }' });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('handles empty exposedSchemas array', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const req = request.agent(started.httpServer);
      setHeaders(req, { Host: hosts.empty });
      const res = await req.post('/graphql').send({ query: '{ __typename }' });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('schema introspection', () => {
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

    it('builds schema from multiple schemas correctly', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const req = request.agent(started.httpServer);
      setHeaders(req, {
        Host: hosts.valid,
        ...authHeaders,
      });
      const res = await req.post('/graphql').send({
        query: `{
          __schema {
            queryType { name }
            mutationType { name }
          }
        }`,
      });

      expect(res.status).toBe(200);
      expect(res.body.data.__schema.queryType.name).toBe('Query');
    });

    it('applies simple inflection when enabled', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const req = request.agent(started.httpServer);
      setHeaders(req, {
        Host: hosts.valid,
        ...authHeaders,
      });
      const res = await req.post('/graphql').send({
        query: `{
          __schema {
            types { name }
          }
        }`,
      });

      expect(res.status).toBe(200);
      const typeNames = res.body.data.__schema.types.map((t: any) => t.name);
      expect(typeNames).toContain('UserAccount');
    });

    it('includes connection filters when enabled', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const req = request.agent(started.httpServer);
      setHeaders(req, {
        Host: hosts.valid,
        ...authHeaders,
      });
      const res = await req.post('/graphql').send({
        query: `{
          __type(name: "ItemFilter") {
            name
            inputFields { name }
          }
        }`,
      });

      expect(res.status).toBe(200);
      expect(res.body.data.__type?.name).toBe('ItemFilter');
    });

    it('includes full-text search when enabled', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const req = request.agent(started.httpServer);
      setHeaders(req, {
        Host: hosts.valid,
        ...authHeaders,
      });
      const res = await req.post('/graphql').send({
        query: `{
          filterType: __type(name: "ItemFilter") {
            inputFields { name }
          }
          conditionType: __type(name: "ItemCondition") {
            inputFields { name }
          }
        }`,
      });

      expect(res.status).toBe(200);
      const filterFields =
        res.body.data.filterType?.inputFields.map((f: any) => f.name) || [];
      const conditionFields =
        res.body.data.conditionType?.inputFields.map((f: any) => f.name) || [];
      expect([...filterFields, ...conditionFields]).toContain(
        'tsvSearchDocument'
      );
    });
  });
});
