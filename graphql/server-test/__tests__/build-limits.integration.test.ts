/**
 * Bounded cold handler builds over real HTTP: a request whose build cannot get
 * a slot reaches the client as a retryable 503 with `Retry-After`, not as a 200
 * carrying a masked error, and the same request is served once a slot is free.
 *
 * Run tests:
 *   pnpm test -- --testPathPattern=build-limits.integration
 */

// A test-only gate in front of the real handler build: the first build holds
// the only slot at the gate until the test releases it, so the overlap the
// test asserts on does not depend on timing.
let mockGate: Promise<void> | undefined;
let mockBuildStarted: (() => void) | undefined;

jest.mock('graphile-cache', () => {
  const actual = jest.requireActual('graphile-cache');
  return {
    ...actual,
    createGraphileInstance: async (...args: Parameters<typeof actual.createGraphileInstance>) => {
      mockBuildStarted?.();
      if (mockGate) await mockGate;
      return actual.createGraphileInstance(...args);
    }
  };
});

import path from 'path';
import type { PgTestClient } from 'pgsql-test';
import type supertest from 'supertest';

import { getConnections, seed } from '../src';

jest.setTimeout(120000);

const sharedSeedRoot = path.join(__dirname, '..', '..', '..', '__fixtures__', 'seed');
const shared = (...segments: string[]) => path.join(sharedSeedRoot, ...segments);
const pgpmWorkspace = path.join(sharedSeedRoot, '..', '..');
const databaseId = '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9';
const metaSchemas = [
  'catalog_private',
  'routing_public',
  'apps_public',
  'metaschema_public',
  'metaschema_modules_public'
];

// Each schema set is a service of its own, so each one needs its own build.
const schemaSets = [
  ['simple-pets-public'],
  ['simple-pets-pets-public'],
  ['simple-pets-public', 'simple-pets-pets-public']
];

describe('bounded cold handler builds', () => {
  let releaseGate: (() => void) | undefined;
  let request: supertest.Agent;
  let pg: PgTestClient;
  let db: PgTestClient;
  let teardown: () => Promise<void>;

  const post = (schemata: string[]) =>
    request
      .post('/graphql')
      .set('X-Database-Id', databaseId)
      .set('X-Schemata', schemata.join(','))
      .send({ query: '{ __typename }' });

  beforeAll(async () => {
    ({ request, pg, db, teardown } = await getConnections(
      {
        schemas: schemaSets[2],
        authRole: 'anonymous',
        // One build at a time and no queue: a build that finds the slot taken
        // is refused at once.
        graphile: { buildLimits: { concurrency: 1, queueMax: 0, queueWaitMs: 2_000 } },
        server: {
          useRouting: true,
          api: { isPublic: false, metaSchemas }
        }
      },
      [
        seed.pgpm(pgpmWorkspace),
        seed.sqlfile([
          shared('app-schemas', 'simple-pets', 'schema.sql'),
          shared('scoped', 'test-data.sql'),
          shared('app-schemas', 'simple-pets', 'test-data.sql')
        ])
      ]
    ));
  });

  beforeEach(async () => {
    await pg.beforeEach();
    await db.beforeEach();
  });

  afterEach(async () => {
    // Never leave a build waiting at the gate, whatever the test did.
    releaseGate?.();
    releaseGate = undefined;
    mockGate = undefined;
    mockBuildStarted = undefined;
    await db.afterEach();
    await pg.afterEach();
  });

  afterAll(async () => {
    await teardown();
  });

  it('refuses builds while the only slot is taken and serves them once it is free', async () => {
    mockGate = new Promise<void>((resolve) => {
      releaseGate = resolve;
    });
    const firstBuildStarted = new Promise<void>((resolve) => {
      mockBuildStarted = resolve;
    });

    // `then` sends the request; the first build takes the slot and waits at the gate.
    const first = post(schemaSets[0]).then((res) => res);
    try {
      await firstBuildStarted;
      mockBuildStarted = undefined;

      const refused = await Promise.all(schemaSets.slice(1).map((schemata) => post(schemata)));
      for (const res of refused) {
        expect(res.status).toBe(503);
        expect(res.headers['retry-after']).toBe('2');
        expect(res.body.errors).toHaveLength(1);
        expect(res.body.errors[0].extensions.code).toBe('SCHEMA_BUILD_UNAVAILABLE');
        expect(res.body.data).toBeUndefined();
      }
    } finally {
      // Open the gate however the checks went, so the first build never stays
      // blocked, and let its request finish before the suite cleans up.
      mockGate = undefined;
      releaseGate?.();
      releaseGate = undefined;
      await first.catch((): undefined => undefined);
    }

    const served = await first;
    expect(served.status).toBe(200);
    expect(served.body).toEqual({ data: { __typename: 'Query' } });

    // The slot is free again: the refused services are built and served on retry.
    for (const schemata of schemaSets.slice(1)) {
      const retry = await post(schemata);
      expect(retry.status).toBe(200);
      expect(retry.body).toEqual({ data: { __typename: 'Query' } });
    }
  });
});
