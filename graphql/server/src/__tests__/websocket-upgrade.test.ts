import { EventEmitter } from 'node:events';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { PassThrough } from 'node:stream';

import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response
} from 'express';

import {
  createGraphileWebSocketOriginGuard,
  createGraphileWebSocketUpgradeGateway,
  getGraphileWebSocketUpgradeTransport,
  GRAPHILE_WEBSOCKET_ADMISSION_FAILED_CODE,
  GRAPHILE_WEBSOCKET_ADMISSION_TIMEOUT_CODE,
  GRAPHILE_WEBSOCKET_BAD_UPGRADE_CODE,
  GRAPHILE_WEBSOCKET_ROUTE_NOT_FOUND_CODE,
  handoffGraphileWebSocketUpgrade
} from '../websocket-upgrade';

const makeRequest = (
  overrides: Partial<IncomingMessage> = {}
): IncomingMessage => Object.assign(new EventEmitter(), {
  method: 'GET',
  url: '/graphql',
  headers: {
    connection: 'keep-alive, Upgrade',
    upgrade: 'websocket',
    host: 'a.example.test'
  },
  aborted: false,
  httpVersion: '1.1',
  httpVersionMajor: 1,
  httpVersionMinor: 1,
  socket: { destroyed: false }
}, overrides) as unknown as IncomingMessage;

const makeSocket = (): PassThrough => new PassThrough();

const outputFrom = (socket: PassThrough): { read(): string } => {
  let value = '';
  socket.on('data', (chunk) => {
    value += chunk.toString();
  });
  return { read: () => value };
};

const settle = async (): Promise<void> => {
  await new Promise<void>((resolve) => setImmediate(resolve));
};

describe('production Graphile WebSocket upgrade gateway', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('rejects the wrong path before tenant routing runs', async () => {
    const app = jest.fn() as unknown as Express;
    const gateway = createGraphileWebSocketUpgradeGateway(app);
    const socket = makeSocket();
    const output = outputFrom(socket);

    gateway.handle(makeRequest({ url: '/graphiql' }), socket, Buffer.alloc(0));
    await settle();

    expect(app).not.toHaveBeenCalled();
    expect(output.read()).toContain('HTTP/1.1 404');
    expect(output.read()).toContain(GRAPHILE_WEBSOCKET_ROUTE_NOT_FOUND_CODE);
  });

  it('rejects malformed upgrades before tenant routing runs', async () => {
    const app = jest.fn() as unknown as Express;
    const gateway = createGraphileWebSocketUpgradeGateway(app);
    const socket = makeSocket();
    const output = outputFrom(socket);

    gateway.handle(makeRequest({
      headers: { host: 'a.example.test', upgrade: 'h2c' }
    }), socket, Buffer.alloc(0));
    await settle();

    expect(app).not.toHaveBeenCalled();
    expect(output.read()).toContain('HTTP/1.1 400');
    expect(output.read()).toContain(GRAPHILE_WEBSOCKET_BAD_UPGRADE_CODE);
  });

  it('preserves A/B routing and auth state on the exact handed-off request', () => {
    const observed: Array<Record<string, unknown>> = [];
    const app = express();
    app.use((request, _response, next) => {
      const host = request.headers.host;
      request.api = {
        dbname: host === 'a.example.test' ? 'tenant_a' : 'tenant_b',
        databaseId: host === 'a.example.test' ? 'database-a' : 'database-b',
        apiId: host === 'a.example.test' ? 'api-a' : 'api-b',
        schema: [host === 'a.example.test' ? 'a_public' : 'b_public'],
        anonRole: 'tenant_anon',
        roleName: 'tenant_user',
        domains: [],
        isPublic: true
      };
      next();
    });
    app.use((request, _response, next) => {
      request.token = {
        user_id: request.headers.authorization?.slice('Bearer '.length)
      };
      next();
    });
    app.use((request, response) => {
      const transport = getGraphileWebSocketUpgradeTransport(request);
      const accepted = handoffGraphileWebSocketUpgrade(request, response);
      observed.push({
        request,
        databaseId: request.api.databaseId,
        userId: request.token.user_id,
        socket: accepted.socket,
        head: accepted.head,
        transport
      });
    });
    const gateway = createGraphileWebSocketUpgradeGateway(app);
    const firstSocket = makeSocket();
    const secondSocket = makeSocket();
    const firstHead = Buffer.from('first-head');
    const secondHead = Buffer.from('second-head');
    const first = makeRequest({
      headers: {
        connection: 'upgrade',
        upgrade: 'websocket',
        host: 'a.example.test',
        authorization: 'Bearer actor-a'
      }
    });
    const second = makeRequest({
      headers: {
        connection: 'upgrade',
        upgrade: 'websocket',
        host: 'b.example.test',
        authorization: 'Bearer actor-b'
      }
    });

    gateway.handle(first, firstSocket, firstHead);
    gateway.handle(second, secondSocket, secondHead);

    expect(observed).toHaveLength(2);
    expect(observed[0]).toMatchObject({
      request: first,
      databaseId: 'database-a',
      userId: 'actor-a',
      socket: firstSocket,
      head: firstHead,
      transport: { socket: firstSocket, head: firstHead }
    });
    expect(observed[1]).toMatchObject({
      request: second,
      databaseId: 'database-b',
      userId: 'actor-b',
      socket: secondSocket,
      head: secondHead,
      transport: { socket: secondSocket, head: secondHead }
    });
    expect(gateway.pendingCount).toBe(0);
  });

  it('retires and detaches the synthetic response before handoff', () => {
    const socket = makeSocket();
    const head = Buffer.from('preserved-head');
    let responseAtHandoff: ServerResponse | undefined;
    let releaseCount = 0;
    const app = ((request: Request, response: Response): void => {
      responseAtHandoff = response as unknown as ServerResponse;
      response.once('close', () => {
        releaseCount++;
      });
      handoffGraphileWebSocketUpgrade(request, response);
    }) as unknown as Express;
    const gateway = createGraphileWebSocketUpgradeGateway(app);

    gateway.handle(makeRequest(), socket, head);

    expect(responseAtHandoff?.socket).toBeNull();
    expect(releaseCount).toBe(1);
    expect(socket.destroyed).toBe(false);
    expect(gateway.pendingCount).toBe(0);
  });

  it('does not leak middleware response bodies or tenant metadata', async () => {
    const app = ((_request: Request, response: Response): void => {
      response.statusCode = 500;
      response.end('tenant_a secret-password cache-key');
    }) as unknown as Express;
    const gateway = createGraphileWebSocketUpgradeGateway(app);
    const socket = makeSocket();
    const output = outputFrom(socket);

    gateway.handle(makeRequest(), socket, Buffer.alloc(0));
    await settle();

    expect(output.read()).toContain('HTTP/1.1 500');
    expect(output.read()).toContain(GRAPHILE_WEBSOCKET_ADMISSION_FAILED_CODE);
    expect(output.read()).not.toContain('tenant_a');
    expect(output.read()).not.toContain('secret-password');
    expect(output.read()).not.toContain('cache-key');
  });

  it('rejects an untrusted browser origin before authentication work', async () => {
    const authenticate = jest.fn((
      _request: Request,
      _response: Response,
      next: NextFunction
    ) => next());
    const app = express();
    app.use((request, _response, next) => {
      request.api = {
        databaseId: 'database-a',
        dbname: 'tenant_a',
        schema: ['a_public'],
        anonRole: 'tenant_anon',
        roleName: 'tenant_user',
        domains: [],
        corsOrigins: ['https://console.example.test']
      };
      next();
    });
    app.use(createGraphileWebSocketOriginGuard());
    app.use(authenticate);
    const gateway = createGraphileWebSocketUpgradeGateway(app);
    const socket = makeSocket();
    const output = outputFrom(socket);

    gateway.handle(makeRequest({
      headers: {
        connection: 'upgrade',
        upgrade: 'websocket',
        host: 'a.example.test',
        origin: 'https://attacker.example.test',
        cookie: 'constructive_session=session-a'
      }
    }), socket, Buffer.alloc(0));
    await settle();

    expect(authenticate).not.toHaveBeenCalled();
    expect(output.read()).toContain('HTTP/1.1 403');
    expect(output.read()).toContain('GRAPHILE_WEBSOCKET_AUTH_REJECTED');
  });

  it('aborts bounded pre-upgrade work when the peer disconnects', async () => {
    let aborted = 0;
    const app = ((request: Request): void => {
      request.once('aborted', () => {
        aborted++;
      });
    }) as unknown as Express;
    const gateway = createGraphileWebSocketUpgradeGateway(app);
    const socket = makeSocket();

    gateway.handle(makeRequest(), socket, Buffer.alloc(0));
    socket.destroy();
    await settle();

    expect(aborted).toBe(1);
    expect(gateway.pendingCount).toBe(0);
  });

  it('times out pre-upgrade work with a stable fail-closed response', async () => {
    jest.useFakeTimers();
    let aborted = 0;
    let responseClosed = 0;
    const app = ((request: Request, response: Response): void => {
      request.once('aborted', () => {
        aborted++;
      });
      response.once('close', () => {
        responseClosed++;
      });
    }) as unknown as Express;
    const gateway = createGraphileWebSocketUpgradeGateway(app, {
      admissionTimeoutMs: 25
    });
    const socket = makeSocket();
    const output = outputFrom(socket);

    gateway.handle(makeRequest(), socket, Buffer.alloc(0));
    await jest.advanceTimersByTimeAsync(25);

    expect(aborted).toBe(1);
    expect(responseClosed).toBe(1);
    expect(output.read()).toContain('HTTP/1.1 503');
    expect(output.read()).toContain(GRAPHILE_WEBSOCKET_ADMISSION_TIMEOUT_CODE);
    expect(output.read()).toContain('Retry-After: 1');
    expect(gateway.pendingCount).toBe(0);
  });

  it('aborts waiters and closes synthetic responses before shutdown rejection', async () => {
    let aborted = 0;
    let responseClosed = 0;
    const app = ((request: Request, response: Response): void => {
      request.once('aborted', () => {
        aborted++;
      });
      response.once('close', () => {
        responseClosed++;
      });
    }) as unknown as Express;
    const gateway = createGraphileWebSocketUpgradeGateway(app);
    const socket = makeSocket();
    const output = outputFrom(socket);

    gateway.handle(makeRequest(), socket, Buffer.alloc(0));
    expect(gateway.pendingCount).toBe(1);
    gateway.close();
    await settle();

    expect(aborted).toBe(1);
    expect(responseClosed).toBe(1);
    expect(gateway.pendingCount).toBe(0);
    expect(output.read()).toContain('HTTP/1.1 503');
    expect(output.read()).toContain('GRAPHILE_WEBSOCKET_SERVER_CLOSING');
  });
});
