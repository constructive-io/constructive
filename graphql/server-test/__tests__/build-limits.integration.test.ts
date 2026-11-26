/**
 * Bounded cold handler builds over real HTTP: a request whose build cannot get
 * a slot reaches the client as a retryable 503 with `Retry-After`, not as a 200
 * carrying a masked error, and the same request is served once a slot is free.
 *
 * Run tests:
 *   pnpm test -- --testPathPattern=build-limits.integration
 */

import path from 'path';
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
  let request: supertest.Agent;
  let teardown: () => Promise<void>;

  const post = (schemata: string[]) =>
    request
      .post('/graphql')
      .set('X-Database-Id', databaseId)
      .set('X-Schemata', schemata.join(','))
      .send({ query: '{ __typename }' });

  beforeAll(async () => {
    ({ request, teardown } = await getConnections(
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

  afterAll(async () => {
    await teardown();
  });

  it('refuses builds beyond the limit with 503 and serves them on retry', async () => {
    const first = await Promise.all(schemaSets.map((schemata) => post(schemata)));

    const served = first.filter((res) => res.status === 200);
    const refused = first.filter((res) => res.status !== 200);
    // The first build to take the slot holds it for the whole schema build,
    // while the other requests arrive within a few milliseconds of it.
    expect(served.length).toBeGreaterThanOrEqual(1);
    expect(refused.length).toBeGreaterThanOrEqual(1);
    for (const res of served) {
      expect(res.body).toEqual({ data: { __typename: 'Query' } });
    }
    for (const res of refused) {
      expect(res.status).toBe(503);
      expect(res.headers['retry-after']).toBe('2');
      expect(res.body.errors).toHaveLength(1);
      expect(res.body.errors[0].extensions.code).toBe('SCHEMA_BUILD_UNAVAILABLE');
      expect(res.body.data).toBeUndefined();
    }

    // Retried one at a time, every service gets its slot and is served.
    for (const schemata of schemaSets) {
      const retry = await post(schemata);
      expect(retry.status).toBe(200);
      expect(retry.body).toEqual({ data: { __typename: 'Query' } });
    }
  });
});
