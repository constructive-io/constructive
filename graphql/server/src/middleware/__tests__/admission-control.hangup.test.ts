import { DEFAULT_REQUEST_PROTECTION } from '@constructive-io/express-context';
import express from 'express';
import http from 'http';
import type { AddressInfo } from 'net';
import net from 'net';

import { createAdmissionControlMiddleware } from '../admission-control';

// A real server and real sockets: the tenant's bounds are resolved first, then
// one middleware stands in for the async ones that run before admission in
// server.ts (api, authenticate, context, standing, request-protection).
const startServer = async (): Promise<{
  port: number;
  arrived: () => number;
  hungUp: () => boolean;
  handled: () => number;
  close: () => Promise<void>;
}> => {
  let arrived = 0;
  let hungUp = false;
  let handled = 0;
  const app = express();
  app.use((req, _res, next) => {
    (req as any).databaseId = 'db-1';
    (req as any).requestProtection = {
      ...DEFAULT_REQUEST_PROTECTION,
      maxConcurrentRequests: 1,
      maxQueueWaitMs: 0
    };
    next();
  });
  // The hanging-up request waits here until its response has closed, so it
  // reaches admission only after 'close' has already fired.
  app.use((req, res, next) => {
    arrived += 1;
    if (!req.headers['x-hang-up']) return next();
    res.once('close', () => {
      hungUp = true;
      next();
    });
  });
  app.use('/graphql', createAdmissionControlMiddleware({ trustedProxyHops: 0 }));
  app.use('/graphql', (_req, res) => {
    handled += 1;
    res.json({ data: { ok: true } });
  });
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    port,
    arrived: () => arrived,
    hungUp: () => hungUp,
    handled: () => handled,
    close: () => new Promise<void>((resolve) => server.close(() => resolve()))
  };
};

const request = (port: number): Promise<number> =>
  new Promise((resolve, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port, path: '/graphql', method: 'POST', agent: false },
      (res) => {
        res.resume();
        res.on('end', () => resolve(res.statusCode ?? 0));
      }
    );
    req.on('error', reject);
    req.end('{}');
  });

const hangUpRightAfterSending = (port: number, arrived: () => number, hungUp: () => boolean): Promise<void> =>
  new Promise((resolve) => {
    const before = arrived();
    const socket = net.connect(port, '127.0.0.1', () => {
      socket.write('POST /graphql HTTP/1.1\r\nHost: x\r\nContent-Length: 2\r\nX-Hang-Up: 1\r\nConnection: close\r\n\r\n{}');
      // Hang up once the server has the request; resolve once it has seen the hang-up.
      const poll = setInterval(() => {
        if (!socket.destroyed && arrived() > before) socket.destroy();
        if (hungUp()) {
          clearInterval(poll);
          resolve();
        }
      }, 1);
    });
  });

describe('admission control with a client that hangs up before admission runs', () => {
  it('gives the slot back', async () => {
    const server = await startServer();
    try {
      expect(await request(server.port)).toBe(200);

      await hangUpRightAfterSending(server.port, server.arrived, server.hungUp);
      // Let admission run for the request that hung up before the next one arrives.
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(await request(server.port)).toBe(200);
      // All three reached the server; the handler ran for the two that waited for an answer.
      expect(server.arrived()).toBe(3);
      expect(server.handled()).toBe(2);
    } finally {
      await server.close();
    }
  });
});
