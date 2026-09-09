import '@dataplan/pg/adaptors/pg';

import { gather } from 'graphile-build';
import type { GraphileConfig } from 'graphile-config';

import { PgScopedIntrospectionPlugin } from '../src';

const makeService = (overrides: Record<string, unknown> = {}): never =>
  ({
    name: 'main',
    schemas: ['tenant_a'],
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

  it('rejects configuration for an unknown PostgreSQL service', async () => {
    await expect(
      gather({
        plugins: [PgScopedIntrospectionPlugin, consumerPlugin],
        pgServices: [makeService()],
        gather: {
          pgScopedIntrospection: {
            analytics: {},
          },
        },
      })
    ).rejects.toThrow(/unknown PostgreSQL service\(s\): analytics/);
  });

  it.each([
    ['empty', '', 'exact non-empty schema names'],
    ['surrounding whitespace', ' shared', 'exact non-empty schema names'],
    ['system', 'pg_catalog', 'must not be a system schema'],
    ['NUL', 'tenant\0a', 'must not contain NUL bytes'],
  ])('rejects %s dependency schema names', async (_label, schema, message) => {
    await expect(
      gather({
        plugins: [PgScopedIntrospectionPlugin, consumerPlugin],
        pgServices: [makeService()],
        gather: {
          pgScopedIntrospection: {
            main: { allowedDependencySchemas: [schema] },
          },
        },
      })
    ).rejects.toThrow(message);
  });
});
