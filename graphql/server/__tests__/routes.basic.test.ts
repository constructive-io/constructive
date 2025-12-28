process.env.LOG_SCOPE = 'graphile-test';

import { join } from 'path';
import type { Server as HttpServer } from 'http';
import request, { type Test } from 'supertest';
import { getEnvOptions } from '@constructive-io/graphql-env';
import type { ConstructiveOptions } from '@constructive-io/graphql-types';
import { PgpmInit } from '@pgpmjs/core';
import { seed, getConnections } from 'pgsql-test';
import { Server as GraphQLServer } from '../src/server';

jest.setTimeout(30000);

const appSchemas = ['app_public'];
const metaSchemas = ['collections_public', 'meta_public'];
const sql = (f: string) => join(__dirname, '../../test/sql', f);
const metaSeedPath = join(__dirname, '../../../../constructive-db/services/svc');
const testDatabaseId = '0b22e268-16d6-582b-950a-24e108688849';

type PgsqlConnections = Awaited<ReturnType<typeof getConnections>>;
type PgTestClient = PgsqlConnections['db'];
type SeededConnections = Pick<PgsqlConnections, 'db' | 'pg' | 'teardown'>;

type RouteCase = {
  name: string;
  enableMetaApi: boolean;
  isPublic: boolean;
  seed: () => SeededConnections;
  getHeaders?: () => Record<string, string>;
};

const metaHosts = {
  publicHost: 'api.constructive.io',
  privateHost: 'meta.constructive.io',
};

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

const requireConnections = (
  connections: SeededConnections | null,
  label: string
): SeededConnections => {
  if (!connections) {
    throw new Error(`${label} connections not initialized`);
  }
  return connections;
};

const setHeaders = (req: Test, headers?: Record<string, string>): Test => {
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

  await started.server.removeEventListener();
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
    {},
    [
      bootstrapAdminUsers,
      seed.pgpm(metaSeedPath),
    ]
  );

  await db.begin();
  db.setContext({
    role: 'administrator',
    'jwt.claims.database_id': testDatabaseId,
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
        defaultDatabaseId: testDatabaseId,
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
  await Promise.all([metaDb?.teardown(), appDb?.teardown()]);
});

const cases: RouteCase[] = [
  {
    name: 'meta enabled, public',
    enableMetaApi: true,
    isPublic: true,
    seed: () => requireConnections(metaDb, 'meta'),
    getHeaders: () => ({ Host: metaHosts.publicHost }),
  },
  {
    name: 'meta enabled, private',
    enableMetaApi: true,
    isPublic: false,
    seed: () => requireConnections(metaDb, 'meta'),
    getHeaders: () => ({ Host: metaHosts.privateHost }),
  },
  {
    name: 'meta disabled, public',
    enableMetaApi: false,
    isPublic: true,
    seed: () => requireConnections(appDb, 'app'),
  },
  {
    name: 'meta disabled, private',
    enableMetaApi: false,
    isPublic: false,
    seed: () => requireConnections(appDb, 'app'),
  },
];

describe.each(cases)(
  '$name',
  ({ enableMetaApi, isPublic, seed, getHeaders }) => {
    let started: StartedServer | null = null;
    let db: PgTestClient;
    let headers: Record<string, string> | undefined;

    beforeAll(async () => {
      const connections = seed();
      db = connections.db;
      headers = getHeaders?.();
      started = await startServer(
        buildOptions({
          db,
          enableMetaApi,
          isPublic,
        })
      );
    });

    beforeEach(async () => {
      db.setContext({
        role: enableMetaApi && isPublic ? 'anonymous' : 'administrator',
        'jwt.claims.database_id': testDatabaseId,
      });
      await db.beforeEach();
    });

    afterEach(async () => {
      await db.afterEach();
    });

    afterAll(async () => {
      await stopServer(started);
      started = null;
    });

    it('GET /healthz returns ok', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const res = await setHeaders(
        request(started.httpServer).get('/healthz'),
        headers
      );

      expect(res.status).toBe(200);
      expect(res.text).toBe('ok');
    });

    it('GET /graphiql returns HTML', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const res = await setHeaders(
        request(started.httpServer).get('/graphiql'),
        headers
      );

      expect(res.status).toBe(200);
      expect(res.text).toContain('GraphiQL');
    });

    it('GET /graphql accepts query params', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const res = await setHeaders(
        request(started.httpServer)
          .get('/graphql')
          .query({ query: '{ __typename }' }),
        headers
      );

      if (res.status === 200) {
        expect(res.body?.data?.__typename).toBe('Query');
      } else {
        expect(res.status).toBe(405);
      }
    });

    it('POST /graphql accepts JSON body', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const res = await setHeaders(
        request(started.httpServer)
          .post('/graphql')
          .send({ query: '{ __typename }' }),
        headers
      );

      expect(res.status).toBe(200);
      expect(res.body?.data?.__typename).toBe('Query');
    });
  }
);
