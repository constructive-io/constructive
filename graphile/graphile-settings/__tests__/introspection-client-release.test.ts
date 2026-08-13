import { withPgClientFromPgService } from '@dataplan/pg';
import { makeSchema } from 'graphile-build';
import { Pool } from 'pg';

import { assertIntrospectionClientReleaseCapabilities } from '../src/introspection-client-release';
import { MinimalPreset } from '../src/plugins';

type TestWithPgClient = {
  <T>(
    pgSettings: Record<string, string | undefined> | null,
    callback: (client: { rawClient: unknown }) => T | Promise<T>,
    options?: { clientReleaseMode?: 'reuse' | 'destroy' }
  ): Promise<T>;
  supportedClientReleaseModes?: readonly ('reuse' | 'destroy')[];
};

const {
  makePgAdaptorWithPgClient,
  makeWithPgClientViaPgClientAlreadyInTransaction,
} = require('@dataplan/pg/adaptors/pg') as {
  makePgAdaptorWithPgClient(pool: unknown): TestWithPgClient;
  makeWithPgClientViaPgClientAlreadyInTransaction(
    client: unknown
  ): TestWithPgClient;
};

const { makePgService: makePostGraphilePgService } =
  require('postgraphile/adaptors/pg') as {
    makePgService(options: Record<string, unknown>): Record<string, unknown>;
  };

const makeRawClient = () => ({
  query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  release: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
});

const makeNodePostgresPool = (rawClient: ReturnType<typeof makeRawClient>) => {
  const pool = Object.create(Pool.prototype) as Pool & {
    connect: jest.Mock;
  };
  pool.connect = jest.fn().mockResolvedValue(rawClient);
  return pool;
};

describe('published dependency capability gate', () => {
  const supported = {
    dataplanPg: 'dataplan-pg-exact-client-destroy-v1',
    graphileBuildPg: 'graphile-build-pg-exact-client-destroy-v1',
  };

  it('allows reuse without patched downstream dependencies', () => {
    expect(() =>
      assertIntrospectionClientReleaseCapabilities('reuse', {
        dataplanPg: undefined,
        graphileBuildPg: undefined,
      })
    ).not.toThrow();
  });

  it('requires both exact destroy protocol capabilities', () => {
    expect(() =>
      assertIntrospectionClientReleaseCapabilities('destroy', supported)
    ).not.toThrow();
    expect(() =>
      assertIntrospectionClientReleaseCapabilities('destroy', {
        ...supported,
        dataplanPg: undefined,
      })
    ).toThrow('GRAPHILE_INTROSPECTION_CLIENT_DESTROY_UNSUPPORTED:@dataplan/pg');
    expect(() =>
      assertIntrospectionClientReleaseCapabilities('destroy', {
        ...supported,
        graphileBuildPg: undefined,
      })
    ).toThrow(
      'GRAPHILE_INTROSPECTION_CLIENT_DESTROY_UNSUPPORTED:graphile-build-pg'
    );
  });
});

describe('per-use PostgreSQL client release mode', () => {
  it('destroys the exact successful checkout once', async () => {
    const rawClient = makeRawClient();
    const pool = makeNodePostgresPool(rawClient);
    const withPgClient = makePgAdaptorWithPgClient(pool as never);

    expect(withPgClient.supportedClientReleaseModes).toEqual([
      'reuse',
      'destroy',
    ]);
    await expect(
      withPgClient(null, async (client) => client.rawClient, {
        clientReleaseMode: 'destroy',
      })
    ).resolves.toBe(rawClient);

    expect(pool.connect).toHaveBeenCalledTimes(1);
    expect(rawClient.release.mock.calls).toEqual([[true]]);
  });

  it('destroys the exact failed checkout once', async () => {
    const marker = new Error('callback failed');
    const rawClient = makeRawClient();
    const pool = makeNodePostgresPool(rawClient);
    const withPgClient = makePgAdaptorWithPgClient(pool as never);

    await expect(
      withPgClient(
        null,
        async () => {
          throw marker;
        },
        { clientReleaseMode: 'destroy' }
      )
    ).rejects.toBe(marker);

    expect(pool.connect).toHaveBeenCalledTimes(1);
    expect(rawClient.release.mock.calls).toEqual([[true]]);
  });

  it('destroys the exact checkout when first-use setup throws synchronously', async () => {
    const marker = new Error('client setup failed');
    const rawClient = makeRawClient();
    rawClient.query.mockImplementationOnce(() => {
      throw marker;
    });
    const pool = makeNodePostgresPool(rawClient);
    const callback = jest.fn();
    const withPgClient = makePgAdaptorWithPgClient(pool as never);

    await expect(
      withPgClient(null, callback, { clientReleaseMode: 'destroy' })
    ).rejects.toBe(marker);

    expect(callback).not.toHaveBeenCalled();
    expect(pool.connect).toHaveBeenCalledTimes(1);
    expect(rawClient.release.mock.calls).toEqual([[true]]);
  });

  it('rejects destroy mode for a structurally compatible custom pool', async () => {
    const rawClient = makeRawClient();
    const pool = { connect: jest.fn().mockResolvedValue(rawClient) };
    const callback = jest.fn();
    const withPgClient = makePgAdaptorWithPgClient(pool as never);

    expect(withPgClient.supportedClientReleaseModes).toEqual(['reuse']);
    await expect(
      withPgClient(null, callback, { clientReleaseMode: 'destroy' })
    ).rejects.toThrow(
      'Exact PostgreSQL client destruction requires a node-postgres Pool'
    );

    expect(pool.connect).not.toHaveBeenCalled();
    expect(callback).not.toHaveBeenCalled();
    expect(rawClient.release).not.toHaveBeenCalled();
  });

  it('reuses the exact checkout once by default', async () => {
    const rawClient = makeRawClient();
    const pool = makeNodePostgresPool(rawClient);
    const withPgClient = makePgAdaptorWithPgClient(pool as never);

    await withPgClient(null, async (client) => client.rawClient);

    expect(pool.connect).toHaveBeenCalledTimes(1);
    expect(rawClient.release.mock.calls).toEqual([[]]);
  });

  it('fails closed before invoking an adaptor that does not advertise destruction', async () => {
    const callback = jest.fn();
    const originalWithPgClient = Object.assign(
      jest.fn(async (): Promise<void> => undefined),
      { release: jest.fn() }
    );
    const service = {
      name: 'unsupported-adaptor',
      adaptor: {
        createWithPgClient: jest.fn().mockReturnValue(originalWithPgClient),
      },
    };

    await expect(
      withPgClientFromPgService(service as never, null, callback, {
        clientReleaseMode: 'destroy',
      })
    ).rejects.toThrow(
      "PostgreSQL service 'unsupported-adaptor' does not support exact client destruction"
    );

    expect(callback).not.toHaveBeenCalled();
    expect(originalWithPgClient).not.toHaveBeenCalled();
  });

  it('refuses to destroy a caller-owned client', async () => {
    const callback = jest.fn();
    const rawClient = makeRawClient();
    const withPgClient = makeWithPgClientViaPgClientAlreadyInTransaction(
      rawClient as never
    );

    expect(withPgClient.supportedClientReleaseModes).toEqual(['reuse']);
    await expect(
      withPgClient(null, callback, { clientReleaseMode: 'destroy' })
    ).rejects.toThrow('Cannot destroy a caller-owned PostgreSQL client');

    expect(callback).not.toHaveBeenCalled();
    expect(rawClient.release).not.toHaveBeenCalled();
  });
});

describe('introspection client release forwarding', () => {
  it.each([
    ['destroy', 'destroy', [[true]]],
    ['default reuse', undefined, [[]]],
  ] as const)(
    'uses %s for the introspection checkout',
    async (_label, clientReleaseMode, expectedReleaseCalls) => {
      const marker = new Error('captured introspection query');
      let sawIntrospection = false;
      const rawClient = makeRawClient();
      rawClient.query.mockImplementation(
        async (query: string | { text: string }) => {
          if (
            typeof query === 'object' &&
            query.text.includes('requested_schema_names')
          ) {
            sawIntrospection = true;
            throw marker;
          }
          return { rows: [], rowCount: 0 };
        }
      );
      const pool = makeNodePostgresPool(rawClient);

      await expect(
        makeSchema({
          extends: [MinimalPreset],
          pgServices: [
            Object.assign(
              makePostGraphilePgService({
                pool: pool as never,
                pubsub: false,
                schemas: ['tenant_a'],
              }),
              {
                introspectionMode: 'scoped-required',
                ...(clientReleaseMode === undefined
                  ? {}
                  : { introspectionClientReleaseMode: clientReleaseMode }),
              }
            ) as never,
          ],
        })
      ).rejects.toBe(marker);

      expect(sawIntrospection).toBe(true);
      expect(pool.connect).toHaveBeenCalledTimes(1);
      expect(rawClient.release.mock.calls).toEqual(expectedReleaseCalls);
    }
  );
});
