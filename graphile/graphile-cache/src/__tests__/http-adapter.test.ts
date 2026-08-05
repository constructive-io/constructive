import type { Server } from 'node:http';

import express, { type Express } from 'express';

import {
  disposeUncachedEntry,
  type GraphileCacheEntry
} from '../graphile-cache';
import {
  attachGraphileHttpHandler,
  createGraphileHttpHandler
} from '../http-adapter';

const closeServer = (server: Server): Promise<void> =>
  new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });

describe('lean Graphile HTTP adapter', () => {
  it('matches the pinned Grafserv HTTP-only runtime contract', async () => {
    // Use require so ts-jest's legacy resolver does not reject Grafserv's
    // conditional `./express/v4` export, which the package build resolves.
    const { grafserv } = require('grafserv/express/v4');
    const serv = grafserv({
      preset: { grafserv: { graphqlPath: '/graphql' } },
      schema: null
    });
    const handler = createGraphileHttpHandler();

    try {
      await attachGraphileHttpHandler(serv, handler, serv.getPreset());
      expect((handler as any).stack).toHaveLength(1);
      expect((handler as any).listen).toBeUndefined();
    } finally {
      await serv.release();
    }
  });

  it('mounts Grafserv on a router with websocket/server allocation disabled', async () => {
    const handler = createGraphileHttpHandler();
    const serv = {
      addTo: jest.fn(async (app: Express) => {
        app.use('/graphql', (_req, res) => {
          res.status(200).json({ data: { adapter: 'router' } });
        });
      })
    };

    await attachGraphileHttpHandler(serv, handler, { grafserv: {} });
    expect(serv.addTo).toHaveBeenCalledWith(handler, null, false);
    expect((handler as any).listen).toBeUndefined();

    const outerApp = express();
    outerApp.use(handler);
    const outerServer = await new Promise<Server>((resolve, reject) => {
      const server = outerApp.listen(0, '127.0.0.1', () => resolve(server));
      server.once('error', reject);
    });
    try {
      const address = outerServer.address();
      if (!address || typeof address === 'string') {
        throw new Error('Expected an address for the test HTTP server');
      }
      const response = await fetch(`http://127.0.0.1:${address.port}/graphql`);
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        data: { adapter: 'router' }
      });
    } finally {
      await closeServer(outerServer);
    }
  });

  it('fails closed instead of silently disabling configured WebSockets', () => {
    const handler = createGraphileHttpHandler();
    const serv = { addTo: jest.fn() };

    expect(() => attachGraphileHttpHandler(serv, handler, {
      grafserv: { websockets: true }
    })).toThrow(/tenant-aware upgrade handler on the shared server/);
    expect(serv.addTo).not.toHaveBeenCalled();
  });

  it('mounts HTTP without an exclusive listener when shared routing is explicit', async () => {
    const handler = createGraphileHttpHandler();
    const serv = { addTo: jest.fn() };

    await attachGraphileHttpHandler(serv, handler, {
      grafserv: { websockets: true }
    }, {
      sharedWebsocketRouting: true
    });

    expect(serv.addTo).toHaveBeenCalledWith(handler, null, false);
  });

  it('disposes a serverless adapter and its realtime manager in order', async () => {
    const events: string[] = [];
    const entry: GraphileCacheEntry = {
      pgl: {
        release: jest.fn(async () => {
          events.push('postgraphile-release');
        })
      } as unknown as GraphileCacheEntry['pgl'],
      serv: {} as GraphileCacheEntry['serv'],
      handler: createGraphileHttpHandler(),
      httpServer: null,
      cacheKey: 'lean-adapter',
      createdAt: Date.now(),
      realtimeManager: {
        stop: jest.fn(async () => {
          events.push('realtime-stop');
        })
      }
    };

    await disposeUncachedEntry(entry);

    expect(events).toEqual(['postgraphile-release', 'realtime-stop']);
    expect(entry.realtimeManager?.stop).toHaveBeenCalledTimes(1);
    expect(entry.pgl.release).toHaveBeenCalledTimes(1);
  });
});
