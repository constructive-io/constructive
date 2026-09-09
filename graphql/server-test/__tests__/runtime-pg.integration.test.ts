/**
 * Runtime PostgreSQL credentials through the production HTTP/routing path.
 *
 * This test deliberately observes only GraphQL responses. The session_user
 * function is SQL INVOKER, so the returned login proves which runtime pool
 * executed the request while routing still uses the control-plane connection and Graphile
 * introspection assumes the explicitly configured anonymous role.
 */
import { randomUUID } from 'crypto';
import path from 'path';
import type {
  RuntimePgResolver,
  RuntimePgResolverInput
} from '@constructive-io/graphql-types';

import { getConnections, seed } from '../src';

jest.setTimeout(60000);

const sharedSeedRoot = path.join(__dirname, '..', '..', '..', '__fixtures__', 'seed');
const shared = (...segments: string[]) => path.join(sharedSeedRoot, ...segments);
const pgpmWorkspace = path.join(sharedSeedRoot, '..', '..');
const schemas = ['simple-pets-public', 'simple-pets-pets-public'];
const metaSchemas = [
  'catalog_private',
  'routing_public',
  'apps_public',
  'metaschema_public',
  'metaschema_modules_public'
];
const scopedDatabaseId = '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9';
const appApiId = '6c9997a4-591b-4cb3-9313-4ef45d6f134e';
const anonymousRole = 'anonymous';
const authenticatedRole = 'authenticated';
const roleSuffix = `${process.pid}_${randomUUID().replace(/-/g, '')}`;
const runtimeRoleA = `runtime_http_a_${roleSuffix}`;
const runtimeRoleB = `runtime_http_b_${roleSuffix}`;
const runtimePasswordA = `runtime-http-a-${randomUUID()}`;
const runtimePasswordB = `runtime-http-b-${randomUUID()}`;

const quoteIdentifier = (value: string): string =>
  `"${value.replace(/"/g, '""')}"`;
const quoteLiteral = (value: string): string =>
  `'${value.replace(/'/g, "''")}'`;

const roleSetup = seed.fn(async ({ pg, config }) => {
  await pg.query(`
    CREATE ROLE ${quoteIdentifier(runtimeRoleA)}
      LOGIN PASSWORD ${quoteLiteral(runtimePasswordA)}
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
    CREATE ROLE ${quoteIdentifier(runtimeRoleB)}
      LOGIN PASSWORD ${quoteLiteral(runtimePasswordB)}
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;

    GRANT ${quoteIdentifier(anonymousRole)}, ${quoteIdentifier(authenticatedRole)}
      TO ${quoteIdentifier(runtimeRoleA)}, ${quoteIdentifier(runtimeRoleB)};
    GRANT CONNECT ON DATABASE ${quoteIdentifier(config.database)}
      TO ${quoteIdentifier(runtimeRoleA)}, ${quoteIdentifier(runtimeRoleB)};

    CREATE OR REPLACE FUNCTION "simple-pets-public".runtime_session_user()
      RETURNS text
      LANGUAGE sql
      STABLE
      SECURITY INVOKER
      AS $$ SELECT session_user::text $$;
    GRANT USAGE ON SCHEMA "simple-pets-public" TO ${quoteIdentifier(anonymousRole)};
    GRANT EXECUTE ON FUNCTION "simple-pets-public".runtime_session_user()
      TO ${quoteIdentifier(anonymousRole)};
  `);
});

type ResolverMode = 'a' | 'b' | 'reject' | 'missing' | 'mismatch';

describe('runtime PostgreSQL credentials over scoped HTTP', () => {
  let fixture: Awaited<ReturnType<typeof getConnections>>;
  let resolverMode: ResolverMode = 'a';
  let resolverCalls = 0;
  const routeInputs: RuntimePgResolverInput[] = [];

  const runtimePgResolver: RuntimePgResolver = async (input) => {
    resolverCalls += 1;
    routeInputs.push({
      databaseId: input.databaseId,
      databaseName: input.databaseName,
      apiId: input.apiId,
      schemas: [...input.schemas],
      roles: [...input.roles] as [string, string]
    });

    if (resolverMode === 'reject') {
      throw new Error('runtime resolver rejected');
    }
    if (resolverMode === 'missing') {
      return { database: input.databaseName, user: runtimeRoleA };
    }

    const credentials = resolverMode === 'b'
      ? { user: runtimeRoleB, password: runtimePasswordB }
      : { user: runtimeRoleA, password: runtimePasswordA };
    if (resolverMode === 'mismatch') {
      return {
        database: input.databaseName,
        ...credentials,
        host: '127.0.0.2',
        port: 1
      };
    }
    return { database: input.databaseName, ...credentials };
  };

  const postSessionUser = () =>
    fixture.request
      .post('/graphql')
      .set('Host', 'app.test.constructive.io')
      .send({ query: '{ runtimeSessionUser }' });

  const expectRuntimeError = (
    response: { status: number; body: { data?: unknown; error?: { code?: string } } },
    code: string
  ): void => {
    expect(response.status).toBe(500);
    expect(response.body.error?.code).toBe(code);
    expect(response.body.data).toBeUndefined();
  };

  beforeAll(async () => {
    fixture = await getConnections(
      {
        schemas,
        authRole: anonymousRole,
        runtimePgResolver,
        server: {
          useRouting: true,
          api: {
            isPublic: true,
            metaSchemas,
            introspectionRole: anonymousRole
          }
        }
      },
      [
        seed.pgpm(pgpmWorkspace),
        seed.sqlfile([
          shared('app-schemas', 'simple-pets', 'schema.sql'),
          shared('scoped', 'test-data.sql'),
          shared('app-schemas', 'simple-pets', 'test-data.sql')
        ]),
        roleSetup
      ]
    );
  });

  beforeEach(async () => {
    await fixture.pg.beforeEach();
    await fixture.db.beforeEach();
  });

  afterEach(async () => {
    try { await fixture.db.afterEach(); }
    finally { await fixture.pg.afterEach(); }
  });

  afterAll(async () => {
    if (!fixture) return;

    let firstError: unknown;
    const capture = (error: unknown): void => {
      if (firstError === undefined) firstError = error;
    };

    // Stop Graphile and runtime pools before dropping the login roles. The
    // root fixture client remains available for cleanup until db teardown.
    try {
      await fixture.server.stop();
    } catch (error) {
      capture(error);
    }

    try {
      await fixture.pg.query(`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE usename IN (${quoteLiteral(runtimeRoleA)}, ${quoteLiteral(runtimeRoleB)})
          AND pid <> pg_backend_pid();
      `);
      await fixture.pg.query(`
        DROP OWNED BY ${quoteIdentifier(runtimeRoleA)}, ${quoteIdentifier(runtimeRoleB)};
        DROP ROLE ${quoteIdentifier(runtimeRoleA)}, ${quoteIdentifier(runtimeRoleB)};
      `);
    } catch (error) {
      capture(error);
    }

    try {
      // server.stop() is idempotent; teardown still closes the database and
      // all pgsql-test-owned clients/pools even when an earlier step failed.
      await fixture.teardown();
    } catch (error) {
      capture(error);
    }

    if (firstError !== undefined) throw firstError;
  });

  it('uses each resolved login through Graphile and isolates cache generations', async () => {
    resolverMode = 'a';
    const first = await postSessionUser();
    expect(first.status).toBe(200);
    expect(first.body.errors).toBeUndefined();
    expect(first.body.data.runtimeSessionUser).toBe(runtimeRoleA);
    expect(resolverCalls).toBe(1);

    const cacheHit = await postSessionUser();
    expect(cacheHit.status).toBe(200);
    expect(cacheHit.body.errors).toBeUndefined();
    expect(cacheHit.body.data.runtimeSessionUser).toBe(runtimeRoleA);
    expect(resolverCalls).toBe(2);

    resolverMode = 'b';
    const rotated = await postSessionUser();
    expect(rotated.status).toBe(200);
    expect(rotated.body.errors).toBeUndefined();
    expect(rotated.body.data.runtimeSessionUser).toBe(runtimeRoleB);
    expect(resolverCalls).toBe(3);

    expect(routeInputs).toHaveLength(3);
    expect(routeInputs[0]).toEqual({
      databaseId: scopedDatabaseId,
      databaseName: fixture.pg.config.database,
      apiId: appApiId,
      schemas,
      roles: [anonymousRole, authenticatedRole]
    });
    expect(routeInputs[1]).toEqual(routeInputs[0]);
    expect(routeInputs[2]).toEqual(routeInputs[0]);
  });

  it('returns resolver and runtime-target errors without falling back', async () => {
    const callsBeforeErrors = resolverCalls;

    resolverMode = 'reject';
    const rejected = await postSessionUser();
    expectRuntimeError(rejected, 'INTERNAL_ERROR');
    expect(resolverCalls).toBe(callsBeforeErrors + 1);

    resolverMode = 'missing';
    const missing = await postSessionUser();
    expectRuntimeError(missing, 'INTERNAL_ERROR');
    expect(resolverCalls).toBe(callsBeforeErrors + 2);

    resolverMode = 'mismatch';
    const mismatched = await postSessionUser();
    expectRuntimeError(mismatched, 'INTERNAL_ERROR');
    expect(resolverCalls).toBe(callsBeforeErrors + 3);

    resolverMode = 'b';
    const recovered = await postSessionUser();
    expect(recovered.status).toBe(200);
    expect(recovered.body.errors).toBeUndefined();
    expect(recovered.body.data.runtimeSessionUser).toBe(runtimeRoleB);
    expect(resolverCalls).toBe(callsBeforeErrors + 4);
  });
});
