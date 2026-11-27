import { DEFAULT_REQUEST_PROTECTION } from '@constructive-io/express-context';
import express from 'express';
import http from 'http';
import type { AddressInfo } from 'net';
import net from 'net';

import { createAdmissionControlMiddleware } from '../admission-control';

// A real server and real sockets: the tenant's bounds are resolved first, then
// an async step stands in for the middlewares that run before admission in
// server.ts (api, authenticate, context, standing, request-protection).
const startServer = async (): Promise<{ port: number; handled: () => number; close: () => Promise<void> }> => {
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
  app.use((_req, _res, next) => {
    setTimeout(next, 50);
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

const hangUpRightAfterSending = (port: number): Promise<void> =>
  new Promise((resolve) => {
    const socket = net.connect(port, '127.0.0.1', () => {
      socket.write('POST /graphql HTTP/1.1\r\nHost: x\r\nContent-Length: 2\r\nConnection: close\r\n\r\n{}');
      socket.destroy();
      resolve();
    });
  });

describe('admission control with a client that hangs up before admission runs', () => {
  it('gives the slot back', async () => {
    const server = await startServer();
    try {
      expect(await request(server.port)).toBe(200);

      await hangUpRightAfterSending(server.port);
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(await request(server.port)).toBe(200);
      // The GraphQL handler ran for the two requests that waited for an answer, not for the one that left.
      expect(server.handled()).toBe(2);
    } finally {
      await server.close();
    }
  });
});
