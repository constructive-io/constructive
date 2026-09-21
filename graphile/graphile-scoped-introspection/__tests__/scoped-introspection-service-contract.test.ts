import '@dataplan/pg/adaptors/pg';

import { gather } from 'graphile-build';
import type { GraphileConfig } from 'graphile-config';
import { makeIntrospectionQuery } from 'pg-introspection';

import { ConstructivePgIntrospectionPlugin } from '../src';

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
        plugins: [ConstructivePgIntrospectionPlugin, consumerPlugin],
        gather: {
          pgScopedIntrospection: Object.fromEntries(
            [first, second].map((service: any) => [service.name, true])
          ),
        },
        pgServices: [first, second],
      })
    ).rejects.toThrow(message);
  });

  it('rejects unknown service names even when scoped introspection is false', async () => {
    await expect(
      gather({
        plugins: [ConstructivePgIntrospectionPlugin, consumerPlugin],
        gather: { pgScopedIntrospection: { missing: false } },
        pgServices: [makeService()],
      })
    ).rejects.toThrow(
      'unknown PostgreSQL service(s): missing'
    );
  });

  it('uses stock introspection when a known service is explicitly false', async () => {
    const marker = new Error('stock query captured');
    let captured: { text: string; values?: unknown[] } | null = null;
    const service = makeService({
      adaptor: {
        createWithPgClient: jest.fn(async () =>
          Object.assign(
            async (
              _settings: unknown,
              callback: (client: {
                query(query: { text: string; values?: unknown[] }): never;
              }) => never
            ) =>
              callback({
                query(query) {
                  captured = query;
                  throw marker;
                },
              }),
            { release: jest.fn() }
          )
        ),
      },
    });

    await expect(
      gather({
        plugins: [ConstructivePgIntrospectionPlugin, consumerPlugin],
        gather: { pgScopedIntrospection: { main: false } },
        pgServices: [service],
      })
    ).rejects.toBe(marker);
    expect(captured).toEqual({ text: makeIntrospectionQuery() });
  });
});
