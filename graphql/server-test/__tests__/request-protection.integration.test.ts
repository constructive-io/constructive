/**
 * The document gate (query depth, cost, page size) over real HTTP: a refused
 * operation must reach the client with its registered error code and a client
 * error status, not as an unexplained HTTP 500.
 *
 * Run tests:
 *   pnpm test -- --testPathPattern=request-protection.integration
 */

import path from 'path';
import type supertest from 'supertest';

import { getConnections, seed } from '../src';

// Temporary: delete with the seed when @pgpm/function-resolution > 0.47.9 is pinned.
const entryReadersSeed = path.join(
  __dirname, '..', '..', '..', '__fixtures__', 'seed', 'function-resolution-entry-readers', 'setup.sql'
);

jest.setTimeout(60000);

const sharedSeedRoot = path.join(__dirname, '..', '..', '..', '__fixtures__', 'seed');
const shared = (...segments: string[]) => path.join(sharedSeedRoot, ...segments);
const pgpmWorkspace = path.join(sharedSeedRoot, '..', '..');
const HOST = 'app.test.constructive.io';

const GRAPHQL_RESPONSE = 'application/graphql-response+json';

const nestedOfType = (levels: number): string =>
  'ofType { '.repeat(levels) + 'name' + ' }'.repeat(levels);

/** Nests the recursive introspection schema past its fixed depth ceiling. */
const TOO_DEEP = `{ __type(name: "Query") { fields { type { ${nestedOfType(20)} } } } }`;

describe('request protection document gate', () => {
  let request: supertest.Agent;
  let teardown: () => Promise<void>;

  const post = (
    payload: { query: string; variables?: Record<string, unknown> },
    accept?: string
  ) => {
    const req = request.post('/graphql').set('Host', HOST);
    return (accept ? req.set('Accept', accept) : req).send(payload);
  };

  beforeAll(async () => {
    ({ request, teardown } = await getConnections(
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
          entryReadersSeed,
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

  it.each([
    ['a query nested too deeply', { query: TOO_DEEP }, 'QUERY_TOO_DEEP'],
    [
      'a page larger than the limit',
      { query: '{ animals(first: 100000) { nodes { name } } }' },
      'PAGE_SIZE_TOO_LARGE'
    ],
    [
      'a page larger than the limit, sized by a variable',
      {
        query: 'query Animals($n: Int) { animals(first: $n) { nodes { name } } }',
        variables: { n: 100000 }
      },
      'PAGE_SIZE_TOO_LARGE'
    ]
  ])('refuses %s with its registered code', async (_label, payload, code) => {
    const res = await post(payload, GRAPHQL_RESPONSE);

    expect(res.status).toBe(400);
    expect(res.body.data).toBeUndefined();
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].extensions.code).toBe(code);
  });

  it('answers a client that accepts only application/json with 200 and the code', async () => {
    const res = await post({ query: TOO_DEEP }, 'application/json');

    expect(res.status).toBe(200);
    expect(res.body.data).toBeUndefined();
    expect(res.body.errors[0].extensions.code).toBe('QUERY_TOO_DEEP');
  });

  it('runs a query inside the limits', async () => {
    const res = await post(
      { query: '{ animals(first: 2) { nodes { name } } }' },
      GRAPHQL_RESPONSE
    );

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.animals.nodes).toHaveLength(2);
  });
});
