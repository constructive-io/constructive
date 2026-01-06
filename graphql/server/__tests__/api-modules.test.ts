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
import { roleHeaders } from '../test-utils/role-helpers';

jest.setTimeout(30000);

const metaSchemas = ['metaschema_public', 'services_public', 'metaschema_modules_public'];
const metaSql = (f: string) => join(__dirname, '../__fixtures__/sql', f);
const seededDatabaseId = '0b22e268-16d6-582b-950a-24e108688849';

const hosts = {
  modules: 'modules.example.com',
  noModules: 'no-modules.example.com',
  unknownModule: 'unknown-module.example.com',
  invalidModule: 'invalid-module.example.com',
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

const createMetaDb = async (): Promise<SeededConnections> => {
  const { db, pg, teardown } = await getConnections(
    { db: { extensions: metaDbExtensions } },
    [
      bootstrapAdminUsers,
      deployMetaModules,
      seed.sqlfile([
        metaSql('auth.seed.sql'),
        metaSql('api-modules.seed.sql'),
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

describe('API Modules', () => {
  describe('default server', () => {
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

    describe('cors module', () => {
      it('reads urls array from module data', async () => {
        if (!started) {
          throw new Error('HTTP server not started');
        }
        const req = request.agent(started.httpServer);
        setHeaders(req, {
          Host: hosts.modules,
          Origin: 'https://allowed1.com',
        });
        const res = await req.post('/graphql').send({ query: '{ __typename }' });

        expect(res.headers['access-control-allow-origin']).toBe(
          'https://allowed1.com'
        );
      });

      it('allows multiple configured origins', async () => {
        if (!started) {
          throw new Error('HTTP server not started');
        }
        const req1 = request.agent(started.httpServer);
        setHeaders(req1, {
          Host: hosts.modules,
          Origin: 'https://allowed1.com',
        });
        const res1 = await req1.post('/graphql').send({ query: '{ __typename }' });

        const req2 = request.agent(started.httpServer);
        setHeaders(req2, {
          Host: hosts.modules,
          Origin: 'https://allowed2.com',
        });
        const res2 = await req2.post('/graphql').send({ query: '{ __typename }' });

        expect(res1.headers['access-control-allow-origin']).toBe(
          'https://allowed1.com'
        );
        expect(res2.headers['access-control-allow-origin']).toBe(
          'https://allowed2.com'
        );
      });

      it('blocks origins not in cors module', async () => {
        if (!started) {
          throw new Error('HTTP server not started');
        }
        const req = request.agent(started.httpServer);
        setHeaders(req, {
          Host: hosts.modules,
          Origin: 'https://not-allowed.com',
        });
        const res = await req.post('/graphql').send({ query: '{ __typename }' });

        expect(res.headers['access-control-allow-origin']).toBeUndefined();
      });
    });

    describe('pubkey_challenge module', () => {
      it('adds PublicKeySignature plugin to schema', async () => {
        if (!started) {
          throw new Error('HTTP server not started');
        }
        const req = request.agent(started.httpServer);
        setHeaders(req, { Host: hosts.modules });
        const res = await req.post('/graphql').send({
          query: `{
            __schema {
              mutationType {
                fields {
                  name
                }
              }
            }
          }`,
        });

        expect(res.status).toBe(200);
        const mutationNames = res.body.data.__schema.mutationType.fields.map(
          (f: any) => f.name
        );
        expect(mutationNames).toContain('createUserAccountWithPublicKey');
        expect(mutationNames).toContain('getMessageForSigning');
        expect(mutationNames).toContain('verifyMessageForSigning');
      });

      it('exposes createUserAccountWithPublicKey mutation', async () => {
        if (!started) {
          throw new Error('HTTP server not started');
        }
        const req = request.agent(started.httpServer);
        setHeaders(req, { Host: hosts.modules });
        const res = await req.post('/graphql').send({
          query: `mutation {
            createUserAccountWithPublicKey(input: { publicKey: "user-public-key" }) {
              message
            }
          }`,
        });

        expect(res.status).toBe(200);
        expect(res.body.data.createUserAccountWithPublicKey.message).toBeTruthy();
      });

      it('exposes verifyMessageForSigning mutation', async () => {
        if (!started) {
          throw new Error('HTTP server not started');
        }
        const challengeReq = request.agent(started.httpServer);
        setHeaders(challengeReq, { Host: hosts.modules });
        const createRes = await challengeReq.post('/graphql').send({
          query: `mutation {
            createUserAccountWithPublicKey(input: { publicKey: "user-public-key" }) {
              message
            }
          }`,
        });

        const message = createRes.body.data.createUserAccountWithPublicKey.message;

        const verifyReq = request.agent(started.httpServer);
        setHeaders(verifyReq, { Host: hosts.modules });
        const res = await verifyReq.post('/graphql').send({
          query: `mutation {
            verifyMessageForSigning(input: {
              publicKey: "user-public-key",
              message: "${message}",
              signature: "signed-challenge-response"
            }) {
              accessToken
              accessTokenExpiresAt
            }
          }`,
        });

        expect(res.status).toBe(200);
        expect(res.body.data.verifyMessageForSigning.accessToken).toBeTruthy();
        expect(
          res.body.data.verifyMessageForSigning.accessTokenExpiresAt
        ).toBeTruthy();
      });
    });

    describe('rls_module integration', () => {
      it('uses privateSchema for auth function', async () => {
        if (!started) {
          throw new Error('HTTP server not started');
        }
        const req = request.agent(started.httpServer);
        setHeaders(req, {
          Host: hosts.modules,
          Authorization: 'Bearer valid-token-123',
        });
        const res = await req.post('/graphql').send({ query: '{ __typename }' });

        expect(res.status).toBe(200);
      });

      it('calls authenticate function with token', async () => {
        if (!started) {
          throw new Error('HTTP server not started');
        }
        const req = request.agent(started.httpServer);
        setHeaders(req, {
          Host: hosts.modules,
          Authorization: 'Bearer valid-token-123',
        });
        const res = await req.post('/graphql').send({
          query: '{ userId: currentSetting(name: "jwt.claims.user_id") }',
        });

        expect(res.status).toBe(200);
        expect(res.body.data.userId).toBeTruthy();
      });
    });

    describe('module loading', () => {
      it('handles API with no modules gracefully', async () => {
        if (!started) {
          throw new Error('HTTP server not started');
        }
        const req = request.agent(started.httpServer);
        setHeaders(req, { Host: hosts.noModules });
        const res = await req.post('/graphql').send({ query: '{ __typename }' });

        expect(res.status).toBe(200);
      });

      it('handles API with unknown module gracefully', async () => {
        if (!started) {
          throw new Error('HTTP server not started');
        }
        const req = request.agent(started.httpServer);
        setHeaders(req, { Host: hosts.unknownModule });
        const res = await req.post('/graphql').send({ query: '{ __typename }' });

        expect(res.status).toBe(200);
      });

      it('handles module with invalid data gracefully', async () => {
        if (!started) {
          throw new Error('HTTP server not started');
        }
        const req = request.agent(started.httpServer);
        setHeaders(req, { Host: hosts.invalidModule });
        const res = await req.post('/graphql').send({ query: '{ __typename }' });

        expect(res.status).toBeLessThan(500);
      });
    });
  });

  describe('role behavior (anonymous)', () => {
    let started: StartedServer | null = null;
    let db: PgTestClient;

    beforeAll(async () => {
      const connections = requireConnections(metaDb, 'meta');
      db = connections.db;
      clearCaches();
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

    it('exposes public items to anonymous', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const req = request.agent(started.httpServer);
      setHeaders(req, { Host: hosts.modules });
      const res = await req.post('/graphql').send({
        query: '{ publicItems { nodes { name } } }',
      });

      expect(res.status).toBe(200);
      const names = res.body.data.publicItems.nodes.map((n: any) => n.name);
      expect(names).toContain('Public Item');
    });

    it('omits authenticated-only items from anonymous schema', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const req = request.agent(started.httpServer);
      setHeaders(req, { Host: hosts.modules });
      const res = await req.post('/graphql').send({
        query: '{ items { nodes { name } } }',
      });

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeDefined();
    });
  });

  describe('role behavior (authenticated)', () => {
    let started: StartedServer | null = null;
    let db: PgTestClient;

    beforeAll(async () => {
      const connections = requireConnections(metaDb, 'meta');
      db = connections.db;
      clearCaches();
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

    it('filters items by user for authenticated role', async () => {
      if (!started) {
        throw new Error('HTTP server not started');
      }
      const req = request.agent(started.httpServer);
      setHeaders(req, {
        Host: hosts.modules,
        ...roleHeaders('authenticated'),
      });
      const res = await req.post('/graphql').send({
        query: '{ items { nodes { name } } }',
      });

      expect(res.status).toBe(200);
      const names = res.body.data.items.nodes.map((n: any) => n.name);
      expect(names).toContain('User Item A');
      expect(names).not.toContain('User Item B');
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

    it('calls authenticate_strict if configured and strictAuth enabled', async () => {
      if (!strictStarted) {
        throw new Error('HTTP server not started');
      }
      const req = request.agent(strictStarted.httpServer);
      setHeaders(req, {
        Host: hosts.modules,
        Authorization: 'Bearer valid-token-123',
      });
      const res = await req.post('/graphql').send({ query: '{ __typename }' });

      expect(res.status).toBe(200);
    });
  });
});
