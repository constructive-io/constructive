import '@dataplan/pg/adaptors/pg';

import { gather } from 'graphile-build';
import type { GraphileConfig } from 'graphile-config';

import { PgScopedIntrospectionPlugin } from '../src';

const makeService = (overrides: Record<string, unknown> = {}): never =>
  ({
    name: 'main',
    schemas: ['tenant_a'],
    scopedIntrospection: true,
    introspectionAllowedDependencySchemas: [],
    adaptor: {
      createWithPgClient: jest.fn(() => {
        throw new Error('query should not be reached');
      }),
    },
    adaptorSettings: {},
    withPgClientKey: 'withPgClient',
    pgSettingsKey: 'pgSettings',
    ...overrides,
  }) as never;

describe('scoped introspection service identity contract', () => {
  const consumerPlugin = {
    name: 'ScopedIntrospectionIdentityConsumerPlugin',
    gather: {
      namespace: 'scopedIntrospectionIdentityConsumer',
      async main(_output: Record<string, unknown>, info: any) {
        await info.helpers.pgIntrospection.getIntrospection();
      },
    },
  } as unknown as GraphileConfig.Plugin;

  it.each([
    [
      'name',
      makeService(),
      makeService({
        withPgClientKey: 'secondWithPgClient',
        pgSettingsKey: 'secondPgSettings',
      }),
      'same name',
    ],
    [
      'withPgClientKey',
      makeService(),
      makeService({ name: 'second', pgSettingsKey: 'secondPgSettings' }),
      'same withPgClientKey',
    ],
    [
      'pgSettingsKey',
      makeService(),
      makeService({ name: 'second', withPgClientKey: 'secondWithPgClient' }),
      'same pgSettingsKey',
    ],
  ])('rejects duplicate %s values', async (_field, first, second, message) => {
    await expect(
      gather({
        plugins: [PgScopedIntrospectionPlugin, consumerPlugin],
        pgServices: [first, second],
      })
    ).rejects.toThrow(message);
  });

  it.each([
    ['catalog type policy', { introspectionScopedCatalogTypes: 'all' }],
    [
      'dependency schemas',
      { introspectionAllowedDependencySchemas: ['shared'] },
    ],
    [
      'capability extensions',
      { introspectionCapabilityExtensions: ['pg_trgm'] },
    ],
  ])(
    'rejects %s unless scoped introspection is enabled',
    async (_label, option) => {
      await expect(
        gather({
          plugins: [PgScopedIntrospectionPlugin, consumerPlugin],
          pgServices: [
            makeService({
              scopedIntrospection: false,
              introspectionAllowedDependencySchemas: undefined,
              ...option,
            }),
          ],
        })
      ).rejects.toThrow(/require scopedIntrospection: true/);
    }
  );

  it('rejects a non-boolean scoped introspection flag', async () => {
    await expect(
      gather({
        plugins: [PgScopedIntrospectionPlugin, consumerPlugin],
        pgServices: [
          makeService({
            scopedIntrospection: 'true',
            introspectionAllowedDependencySchemas: undefined,
          }),
        ],
      })
    ).rejects.toThrow('scopedIntrospection must be a boolean');
  });
});
