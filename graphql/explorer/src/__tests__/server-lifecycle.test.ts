import { mkdtemp, rm } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  type GraphQLExplorerCacheScope,
  startGraphQLExplorer,
} from '../server';

const createCacheEntry = (key: string, release: jest.Mock) =>
  ({
    cacheKey: key,
    createdAt: Date.now(),
    pgl: { release },
    serv: {},
    handler: {},
    httpServer: { listening: false },
    realtimeManager: null,
  }) as any;

const listen = async (server: Server): Promise<number> => {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('Missing TCP address.');
  return address.port;
};

const close = async (server: Server): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
};

describe('GraphQL explorer lifecycle', () => {
  let cwd: string;

  beforeEach(async () => {
    cwd = await mkdtemp(join(tmpdir(), 'graphql-explorer-lifecycle-'));
  });

  afterEach(async () => {
    await rm(cwd, { recursive: true, force: true });
  });

  it('resolves only after readiness and closes the listener', async () => {
    const handle = await startGraphQLExplorer(
      { server: { host: '127.0.0.1', port: 0 } },
      { cwd, env: { NODE_ENV: 'test' }, onError: jest.fn() }
    );

    expect(handle.httpServer.listening).toBe(true);
    expect(handle.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
    const response = await fetch(`${handle.url}/healthz`);
    expect(response.ok).toBe(true);

    await handle.close();
    expect(handle.httpServer.listening).toBe(false);
  });

  it('rejects a port conflict with the original system code', async () => {
    const occupyingServer = createServer();
    const port = await listen(occupyingServer);

    try {
      await expect(
        startGraphQLExplorer(
          { server: { host: '127.0.0.1', port } },
          { cwd, env: { NODE_ENV: 'test' }, onError: jest.fn() }
        )
      ).rejects.toMatchObject({ code: 'EADDRINUSE' });
    } finally {
      await close(occupyingServer);
    }
  });

  it('refuses an already-cancelled startup without opening a listener', async () => {
    const controller = new AbortController();
    const reason = new DOMException('cancelled by test', 'AbortError');
    controller.abort(reason);

    await expect(
      startGraphQLExplorer(
        { server: { host: '127.0.0.1', port: 0 } },
        {
          cwd,
          env: { NODE_ENV: 'test' },
          signal: controller.signal,
          onError: jest.fn(),
        }
      )
    ).rejects.toBe(reason);
  });

  it('surfaces listener failures after readiness through the lifecycle handle', async () => {
    const onError = jest.fn();
    const handle = await startGraphQLExplorer(
      { server: { host: '127.0.0.1', port: 0 } },
      { cwd, env: { NODE_ENV: 'test' }, onError }
    );
    const failure = Object.assign(new Error('listener failed'), {
      code: 'EIO',
    });

    handle.httpServer.emit('error', failure);

    await expect(handle.waitForFailure()).rejects.toBe(failure);
    expect(onError).toHaveBeenCalledWith(failure);
    await handle.close();
  });

  it('closes only the cache scope owned by that explorer', async () => {
    const first = await startGraphQLExplorer(
      { server: { host: '127.0.0.1', port: 0 } },
      { cwd, env: { NODE_ENV: 'test', PGHOST: 'first.internal' } }
    );
    const second = await startGraphQLExplorer(
      { server: { host: '127.0.0.1', port: 0 } },
      { cwd, env: { NODE_ENV: 'test', PGHOST: 'second.internal' } }
    );
    const firstScope = first.app.locals
      .graphqlExplorerCacheScope as GraphQLExplorerCacheScope;
    const secondScope = second.app.locals
      .graphqlExplorerCacheScope as GraphQLExplorerCacheScope;
    const releaseFirst = jest.fn(async () => {});
    const releaseSecond = jest.fn(async () => {});
    firstScope.graphileCache.set(
      'same-logical-key',
      createCacheEntry('same-logical-key', releaseFirst)
    );
    secondScope.graphileCache.set(
      'same-logical-key',
      createCacheEntry('same-logical-key', releaseSecond)
    );

    await first.close();

    expect(releaseFirst).toHaveBeenCalledTimes(1);
    expect(releaseSecond).not.toHaveBeenCalled();
    expect(secondScope.graphileCache.has('same-logical-key')).toBe(true);

    await second.close();
  });
});
