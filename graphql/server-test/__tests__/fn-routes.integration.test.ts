/**
 * REST Function Route Integration Tests
 *
 * Verifies the /fn REST routes and the server-injected API provenance
 * claim (`jwt.claims.api_id`):
 *
 *   POST /fn/:alias          → 202 { invocationId } for a rest-enabled binding
 *   GET  /fn/invocations/:id → invocation status/result (RLS-guarded read)
 *
 * The seeded function_invocations INSERT policy only passes when
 * `jwt.claims.api_id` (set transaction-locally by the server from the
 * hostname → services_public.domains → api_id resolution) matches the
 * binding's api_id — so the happy path also proves the claim is injected.
 *
 * Run tests:
 *   pnpm test -- --testPathPattern=fn-routes.integration
 */

import path from 'path';
import { getConnections, seed } from '../src';
import type supertest from 'supertest';

jest.setTimeout(30000);

const sharedSeedRoot = path.join(__dirname, '..', '..', '..', '__fixtures__', 'seed');
const shared = (...segments: string[]) =>
  path.join(sharedSeedRoot, ...segments);
const pgpmWorkspace = path.join(sharedSeedRoot, '..', '..');
const schemas = ['simple-pets-public', 'simple-pets-pets-public'];
const metaSchemas = [
  'services_public',
  'metaschema_public',
  'metaschema_modules_public',
];

const seedAdapters = [
  seed.pgpm(pgpmWorkspace),
  seed.sqlfile([
    shared('services', 'grants.sql'),
    shared('compute', 'setup.sql'),
    shared('app-schemas', 'simple-pets', 'schema.sql'),
    shared('services', 'test-data.sql'),
    shared('compute', 'test-data.sql'),
    shared('app-schemas', 'simple-pets', 'test-data.sql'),
  ]),
];

const API_HOST = 'app.test.constructive.io';

let request: supertest.Agent;
let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ request, teardown } = await getConnections(
    {
      schemas,
      authRole: 'anonymous',
      server: {
        api: {
          enableServicesApi: true,
          isPublic: true,
          metaSchemas,
        },
      },
    },
    seedAdapters
  ));
});

afterAll(async () => {
  await teardown();
});

describe('POST /fn/:alias', () => {
  it('returns 202 with an invocationId for a rest-enabled binding', async () => {
    const res = await request
      .post('/fn/resize')
      .set('Host', API_HOST)
      .send({ width: 100, height: 100 });

    expect(res.status).toBe(202);
    expect(res.body.invocationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it('the created invocation passed the jwt.claims.api_id RLS policy', async () => {
    // The INSERT policy on function_invocations requires
    // jwt.claims.api_id to match the binding's api_id, so a successful
    // insert proves the server injected the claim transaction-locally.
    const create = await request
      .post('/fn/resize')
      .set('Host', API_HOST)
      .send({ check: 'claim' });

    expect(create.status).toBe(202);

    const read = await request
      .get(`/fn/invocations/${create.body.invocationId}`)
      .set('Host', API_HOST);

    expect(read.status).toBe(200);
    expect(read.body.id).toBe(create.body.invocationId);
    expect(read.body.status).toBe('pending');
  });

  it('returns 404 for a missing binding', async () => {
    const res = await request
      .post('/fn/nonexistent')
      .set('Host', API_HOST)
      .send({});

    expect(res.status).toBe(404);
  });

  it('returns 404 for a rest-disabled binding (absent rest config)', async () => {
    const res = await request
      .post('/fn/graphql-only')
      .set('Host', API_HOST)
      .send({});

    expect(res.status).toBe(404);
  });

  it('returns 404 when the HTTP method is not allowed by config.rest', async () => {
    const res = await request
      .put('/fn/resize')
      .set('Host', API_HOST)
      .send({});

    expect(res.status).toBe(404);
  });
});

describe('GET /fn/invocations/:id', () => {
  it('returns 404 for an unknown invocation id', async () => {
    const res = await request
      .get('/fn/invocations/00000000-0000-4000-8000-000000000000')
      .set('Host', API_HOST);

    expect(res.status).toBe(404);
  });

  it('returns 404 for a non-uuid id', async () => {
    const res = await request
      .get('/fn/invocations/not-a-uuid')
      .set('Host', API_HOST);

    expect(res.status).toBe(404);
  });
});
