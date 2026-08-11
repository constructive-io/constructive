import path from 'node:path';

import { getConnections, seed } from 'graphile-test';

import { createUnifiedAuthPlugin } from '../plugin';

jest.setTimeout(60_000);

type Connections = Awaited<ReturnType<typeof getConnections>>;

describe('UnifiedAuthPlugin schema integration', () => {
  let db: Connections['db'];
  let query: Connections['query'];
  let teardown: () => Promise<void>;

  beforeAll(async () => {
    const connections = await getConnections(
      {
        schemas: ['app_public'],
        authRole: 'anonymous',
        preset: { plugins: [createUnifiedAuthPlugin(false)] }
      },
      [
        seed.sqlfile([
          path.join(__dirname, '../../../../../server-test/sql/test.sql')
        ])
      ]
    );
    ({ db, query, teardown } = connections);
  });

  beforeEach(() => db.beforeEach());
  afterEach(() => db.afterEach());
  afterAll(() => teardown());

  it('adds the stable unified-auth Query and Mutation fields', async () => {
    const response = await query<{
      query: { fields: Array<{ name: string }> };
      mutation: { fields: Array<{ name: string }> };
    }>(`
      query UnifiedAuthSchema {
        query: __type(name: "Query") { fields { name } }
        mutation: __type(name: "Mutation") { fields { name } }
      }
    `);

    expect(response.errors).toBeUndefined();
    expect(response.data?.query.fields.map(field => field.name)).toContain(
      'unifiedAuthProviders'
    );
    expect(response.data?.mutation.fields.map(field => field.name)).toEqual(
      expect.arrayContaining([
        'startUnifiedLogin',
        'confirmUnifiedLogin',
        'signInUnifiedLogin',
        'signUpUnifiedLogin',
        'startProviderAuthentication'
      ])
    );
  });
});
