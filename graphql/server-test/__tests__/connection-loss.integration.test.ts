/**
 * PostgreSQL can end a connection the server is using at any time: a restart,
 * a failover, pg_terminate_backend. The request on that connection must fail
 * and the server must keep serving. Unhandled, the client's 'error' event ends
 * the whole process, and this Jest worker with it.
 *
 * Run tests:
 *   pnpm test -- --testPathPattern=connection-loss.integration
 */

import path from 'path';
import type { PgTestClient } from 'pgsql-test/test-client';
import type supertest from 'supertest';

import { getConnections, seed } from '../src';

jest.setTimeout(60000);

const sharedSeedRoot = path.join(__dirname, '..', '..', '..', '__fixtures__', 'seed');
const shared = (...segments: string[]) => path.join(sharedSeedRoot, ...segments);
const pgpmWorkspace = path.join(sharedSeedRoot, '..', '..');
const HOST = 'app.test.constructive.io';

describe('database connection loss during a request', () => {
  let pg: PgTestClient;
  let db: PgTestClient;
  let request: supertest.Agent;
  let teardown: () => Promise<void>;

  const probe = (seconds: number) =>
    request
      .post('/graphql')
      .set('Host', HOST)
      .send({ query: `{ connectionLossProbe(seconds: ${seconds}) }` });

  /** The backend running the probe for the server, once it is running. */
  const probeBackend = async (): Promise<number> => {
    const deadline = Date.now() + 15000;
    for (;;) {
      const { rows } = await pg.query<{ pid: number }>(`
        SELECT pid FROM pg_stat_activity
        WHERE datname = current_database()
          AND state = 'active'
          AND query LIKE '%connection_loss_probe%'
          AND pid <> pg_backend_pid()
      `);
      if (rows.length > 0) return rows[0].pid;
      if (Date.now() >= deadline) throw new Error('The probe never reached PostgreSQL');
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  };

  beforeAll(async () => {
    ({ pg, db, request, teardown } = await getConnections(
      {
        schemas: ['simple-pets-public', 'simple-pets-pets-public'],
        authRole: 'anonymous',
        server: {
          useRouting: true,
          api: {
            isPublic: true,
            metaSchemas: [
              'catalog_private',
              'routing_public',
              'apps_public',
              'metaschema_public',
              'metaschema_modules_public'
            ]
          }
        }
      },
      [
        seed.pgpm(pgpmWorkspace),
        seed.sqlfile([
          shared('app-schemas', 'simple-pets', 'schema.sql'),
          shared('scoped', 'test-data.sql'),
          shared('app-schemas', 'simple-pets', 'test-data.sql'),
          path.join(__dirname, '..', '__fixtures__', 'seed', 'connection-loss', 'probe.sql')
        ])
      ]
    ));
  });

  beforeEach(() => db.beforeEach());
  afterEach(() => db.afterEach());
  afterAll(async () => {
    await teardown?.();
  });

  it('fails the request whose connection is terminated and keeps serving', async () => {
    const warm = await probe(0);
    expect(warm.body.errors).toBeUndefined();
    expect(warm.body.data.connectionLossProbe).toBe('done');

    // supertest sends on then(); keep the promise to await the response later.
    const inFlight = probe(20).then(response => response);
    // pg stays in autocommit, so it sees the server's backend and can end it.
    await pg.query('SELECT pg_terminate_backend($1)', [await probeBackend()]);

    const failed = await inFlight;
    expect(failed.body.errors?.length ?? 0).toBeGreaterThan(0);
    expect(failed.body.data?.connectionLossProbe ?? null).toBeNull();

    const next = await probe(0);
    expect(next.body.errors).toBeUndefined();
    expect(next.body.data.connectionLossProbe).toBe('done');
  });
});
