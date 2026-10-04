/**
 * What an anonymous client of a public API sees when a request fails, over
 * real HTTP through the scoped-routing server.
 *
 * Masking must hold whatever NODE_ENV says: the suite runs with NODE_ENV
 * `development` — what an unset NODE_ENV reads as — so a deployment that
 * forgets to set it still never returns raw PostgreSQL errors.
 *
 * Run tests:
 *   pnpm test -- --testPathPattern=error-masking
 */
import path from 'path';
import type supertest from 'supertest';

import { getConnections, seed } from '../src';

jest.setTimeout(30000);

const sharedSeedRoot = path.join(__dirname, '..', '..', '..', '__fixtures__', 'seed');
const localSeedRoot = path.join(__dirname, '..', '__fixtures__', 'seed', 'error-masking');
const pgpmWorkspace = path.join(sharedSeedRoot, '..', '..');
const metaSchemas = [
  'catalog_private',
  'routing_public',
  'apps_public',
  'metaschema_public',
  'metaschema_modules_public'
];

const HOST = 'app.test.constructive.io';
const MASKED = /^An unexpected error occurred\. Reference: [0-9a-f]{16}$/;

const nodeEnv = process.env.NODE_ENV;
let request: supertest.Agent;
let teardown: () => Promise<void>;

const post = async (query: string) => {
  const res = await request.post('/graphql').set('Host', HOST).send({ query });
  expect(res.status).toBe(200);
  return res.body as {
    data?: unknown;
    errors?: { message: string; extensions?: Record<string, unknown> }[];
    extensions?: unknown;
  };
};

beforeAll(async () => {
  process.env.NODE_ENV = 'development';
  ({ request, teardown } = await getConnections(
    {
      schemas: ['simple-pets-public', 'simple-pets-pets-public'],
      authRole: 'anonymous',
      server: { useRouting: true, api: { isPublic: true, metaSchemas } }
    },
    [
      seed.pgpm(pgpmWorkspace),
      seed.sqlfile([
        path.join(sharedSeedRoot, 'app-schemas', 'simple-pets', 'schema.sql'),
        path.join(sharedSeedRoot, 'scoped', 'test-data.sql'),
        path.join(localSeedRoot, 'schema.sql')
      ])
    ]
  ));
});

afterAll(async () => {
  await teardown();
  process.env.NODE_ENV = nodeEnv;
});

describe('error masking for anonymous callers', () => {
  it('answers a read of a table anon holds no grant on with FORBIDDEN, naming nothing', async () => {
    const body = await post('{ vaultItems { nodes { id secret } } }');

    expect(body.errors).toHaveLength(1);
    expect(body.errors![0].extensions?.code).toBe('FORBIDDEN');
    expect(body.errors![0].message).toBe('You do not have permission to do that.');
    expect(body.extensions).toBeUndefined();
    expect(JSON.stringify(body)).not.toMatch(/vault_items|simple-pets|permission denied/);
  });

  it('passes a registered Constructive error code through unchanged', async () => {
    const body = await post('mutation { inviteMember(input: { address: "" }) { clientMutationId } }');

    expect(body.errors).toHaveLength(1);
    expect(body.errors![0].message).toBe('INVITE_ADDRESS_REQUIRED');
    expect(body.errors![0].extensions?.code).toBe('INVITE_ADDRESS_REQUIRED');
  });

  it('masks an unexpected database error behind a reference id', async () => {
    const body = await post('{ vaultRatio }');

    expect(body.errors).toHaveLength(1);
    expect(body.errors![0].message).toMatch(MASKED);
    expect(body.errors![0].extensions).toEqual({
      code: 'INTERNAL_SERVER_ERROR',
      errorId: expect.any(String)
    });
    expect(JSON.stringify(body)).not.toMatch(/division by zero/);
  });
});
