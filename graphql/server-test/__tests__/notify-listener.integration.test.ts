import { Server } from '@constructive-io/graphql-server';
import { graphileCache } from 'graphile-cache';
import path from 'path';
import type { PgTestClient } from 'pgsql-test/test-client';
import type supertest from 'supertest';

import { getConnections, seed } from '../src';

jest.setTimeout(60000);

const fixtureRoot = path.join(__dirname, '..', '..', '..', '__fixtures__', 'seed');
const databaseId = '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9';
const host = 'app.test.constructive.io';

const eventually = async (assertion: () => void | Promise<void>): Promise<void> => {
  const deadline = Date.now() + 15000;
  for (;;) {
    try {
      await assertion();
      return;
    } catch (error) {
      if (Date.now() >= deadline) throw error;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
};

describe('schema listener recovery against PostgreSQL', () => {
  let pg: PgTestClient;
  let db: PgTestClient;
  let request: supertest.Agent;
  let teardown: () => Promise<void>;
  let listener: Server;

  beforeAll(async () => {
    const connections = await getConnections({
      schemas: ['simple-pets-public', 'simple-pets-pets-public'],
      authRole: 'anonymous',
      server: { useRouting: true, api: {
        isPublic: true,
        metaSchemas: ['catalog_private', 'routing_public', 'apps_public', 'metaschema_public', 'metaschema_modules_public']
      } }
    }, [
      seed.pgpm(path.join(fixtureRoot, '..', '..')),
      seed.sqlfile([
        path.join(fixtureRoot, 'app-schemas', 'simple-pets', 'schema.sql'),
        path.join(fixtureRoot, 'scoped', 'test-data.sql'),
        path.join(fixtureRoot, 'app-schemas', 'simple-pets', 'test-data.sql')
      ])
    ]);
    ({ pg, db, request, teardown } = connections);
    // The HTTP harness starts the server without its listener. Run the same
    // production listener here, sharing the process caches with that server.
    listener = new Server({ pg: pg.config, api: { isPublic: true } });
  });

  beforeEach(() => db.beforeEach());
  afterEach(async () => {
    await listener?.close();
    await db?.afterEach();
  });
  afterAll(async () => { await teardown?.(); });

  const animalFields = async (): Promise<string[]> => {
    const response = await request.post('/graphql').set('Host', host).send({
      query: '{ __type(name: "Animal") { fields { name } } }'
    });
    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    return response.body.data.__type.fields.map((field: { name: string }) => field.name);
  };

  it('rebuilds a warm schema after a lost notice, then receives subsequent notices', async () => {
    const subscribed = jest.spyOn(listener, 'log');
    const flushed = jest.spyOn(listener, 'flush');
    listener.addEventListener();
    await eventually(() => expect(subscribed).toHaveBeenCalledTimes(1));
    expect(await animalFields()).not.toContain('listenerRecovery');
    expect(graphileCache.has(host)).toBe(true);

    const sessions = await pg.query<{ pid: number }>(`
      SELECT pid FROM pg_stat_activity
      WHERE datname = current_database() AND query = 'LISTEN "schema:update"'
    `);
    expect(sessions.rows).toHaveLength(1);
    await pg.query('SELECT pg_terminate_backend($1)', [sessions.rows[0].pid]);
    // pg stays in autocommit so the HTTP server sees DDL and NOTIFY commits.
    // db uses the normal rollback hooks; the harness drops this suite's DB.
    await pg.query('ALTER TABLE "simple-pets-pets-public".animals ADD COLUMN listener_recovery text');
    await pg.query('SELECT pg_notify($1, $2)', ['schema:update', databaseId]);
    expect(flushed).not.toHaveBeenCalled();
    // No notice can rescue this cached handler during the reconnect delay.
    expect(await animalFields()).not.toContain('listenerRecovery');

    await eventually(() => expect(subscribed).toHaveBeenCalledTimes(2));
    expect(await animalFields()).toContain('listenerRecovery');

    await pg.query('ALTER TABLE "simple-pets-pets-public".animals ADD COLUMN after_recovery text');
    await pg.query('SELECT pg_notify($1, $2)', ['schema:update', databaseId]);
    await eventually(() => expect(flushed).toHaveBeenCalledWith(databaseId));
    await flushed.mock.results[0].value;
    expect(await animalFields()).toContain('afterRecovery');
  });
});
