import { EventEmitter } from 'node:events';
import type { AddressInfo } from 'node:net';
import type { Server as HttpServer } from 'node:http';

import {
  createCommandRegistry,
  executeCommand,
  type ProtocolEvent,
} from '@constructive-io/cli-runtime';
import { getEnvOptions } from '@constructive-io/graphql-env';
import { startGraphQLExplorer } from '@constructive-io/graphql-explorer';
import { Server as GraphQLServer } from '@constructive-io/graphql-server';
import { KnativeJobsSvc } from '@constructive-io/knative-job-service';
import { Logger } from '@pgpmjs/logger';
import type { Inquirerer } from 'inquirerer';
import { getPgPool } from 'pg-cache';

import {
  explorerCommand,
  jobsCommand,
  parseFunctions,
  serverCommand,
} from '../src/runtime/service-commands';
import { createServiceHooks } from '../src/runtime/service-hooks';

const mockPromptPoolClose = jest.fn(async (): Promise<void> => undefined);

jest.mock('@constructive-io/graphql-env', () => ({
  getEnvOptions: jest.fn(),
}));
jest.mock('@constructive-io/graphql-explorer', () => ({
  startGraphQLExplorer: jest.fn(),
}));
jest.mock('@constructive-io/graphql-server', () => ({
  Server: jest.fn(),
  withServerEnvironment: async (
    _environment: unknown,
    callback: () => Promise<unknown>
  ) => callback(),
}));
jest.mock('@constructive-io/knative-job-service', () => ({
  KnativeJobsSvc: jest.fn(),
}));
jest.mock('pg-cache', () => ({
  getPgPool: jest.fn(),
  PgPoolCacheManager: class {
    close = mockPromptPoolClose;
  },
}));

class FakeHttpServer extends EventEmitter {
  listening = true;

  constructor(private readonly bindAddress = '127.0.0.1') {
    super();
  }

  address(): AddressInfo {
    return {
      address: this.bindAddress,
      family: 'IPv4',
      port: 43123,
    };
  }

  close(callback?: (error?: Error) => void): this {
    this.listening = false;
    this.emit('close');
    callback?.();
    return this;
  }
}

const mockGetEnvOptions = jest.mocked(getEnvOptions);
const mockStartExplorer = jest.mocked(startGraphQLExplorer);
const MockGraphQLServer = jest.mocked(GraphQLServer);
const MockJobsService = jest.mocked(KnativeJobsSvc);
const mockGetPgPool = jest.mocked(getPgPool);
const commands = createCommandRegistry([
  serverCommand,
  explorerCommand,
  jobsCommand,
]);

const unresolvedFailure = async (): Promise<never> =>
  new Promise<never>(() => undefined);

describe('service command operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEnvOptions.mockImplementation(
      (overrides = {}) =>
        ({
          pg: { database: 'configured-app' },
          features: {},
          api: {},
          ...overrides,
          server: {
            host: '127.0.0.1',
            port: 0,
            ...(overrides as { server?: object }).server,
          },
        }) as never
    );
  });

  const runUntilReady = async (
    commandId: string,
    input: unknown,
    controller: AbortController,
    env: Readonly<Record<string, string | undefined>> = {}
  ) => {
    const events: ProtocolEvent[] = [];
    const outcome = await executeCommand(commands, commandId, input, {
      cwd: process.cwd(),
      mode: 'agent',
      env,
      signal: controller.signal,
      sink: async (event) => {
        events.push(event);
        if (event.event === 'service.ready') {
          controller.abort(new DOMException('test shutdown', 'AbortError'));
        }
      },
    });
    return { events, outcome };
  };

  it('emits readiness, awaits abort cleanup, and suppresses dependency logs', async () => {
    const controller = new AbortController();
    const server = new FakeHttpServer();
    const close = jest.fn(async (): Promise<void> => {
      server.close();
    });
    const log = new Logger('service-command-test');
    const stdout = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    const stderr = jest
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
    MockGraphQLServer.mockImplementation(
      () =>
        ({
          start: jest.fn(async (): Promise<HttpServer> => {
            log.info('this must not escape');
            log.error('this must not escape');
            return server as unknown as HttpServer;
          }),
          waitForFailure: unresolvedFailure,
          close,
        }) as never
    );

    try {
      const { events, outcome } = await runUntilReady(
        'server.start',
        {},
        controller
      );

      expect(outcome.status).toBe('cancelled');
      expect(events.map((event) => event.event)).toEqual([
        'operation.started',
        'service.starting',
        'service.ready',
        'service.stopping',
        'service.stopped',
        'operation.cancelled',
      ]);
      expect(close).toHaveBeenCalledWith({ closeCaches: true });
      expect(MockGraphQLServer).toHaveBeenCalledWith(
        expect.objectContaining({
          features: {
            simpleInflection: true,
            oppositeBaseNames: false,
            postgis: true,
          },
          api: expect.objectContaining({ enableServicesApi: true }),
          server: expect.objectContaining({ port: 5555 }),
        }),
        expect.anything()
      );
      expect(stdout).not.toHaveBeenCalled();
      expect(stderr).not.toHaveBeenCalled();
    } finally {
      stdout.mockRestore();
      stderr.mockRestore();
    }
  });

  it('requires a non-default application database in noninteractive execution', async () => {
    mockGetEnvOptions.mockReturnValueOnce({
      pg: { database: 'postgres' },
      features: {},
      api: { enableServicesApi: true, exposedSchemas: [] },
      server: { host: '127.0.0.1', port: 5555 },
    } as never);

    const outcome = await executeCommand(
      commands,
      'server.start',
      {},
      {
        cwd: process.cwd(),
        mode: 'agent',
        env: {},
      }
    );

    expect(outcome).toMatchObject({
      status: 'failed',
      error: {
        code: 'SERVER_DATABASE_REQUIRED',
        category: 'configuration',
        path: '/database',
      },
    });
    expect(MockGraphQLServer).not.toHaveBeenCalled();
  });

  it('maps direct-schema mode onto the server API contract', async () => {
    const controller = new AbortController();
    const server = new FakeHttpServer();
    MockGraphQLServer.mockImplementation(
      () =>
        ({
          start: jest.fn(async () => server as unknown as HttpServer),
          waitForFailure: unresolvedFailure,
          close: jest.fn(async (): Promise<void> => {
            server.close();
          }),
        }) as never
    );

    const { outcome } = await runUntilReady(
      'server.start',
      {
        database: 'app',
        servicesApi: false,
        schemas: 'public, app_public',
        authRole: 'anonymous',
        roleName: 'authenticated',
      },
      controller
    );

    expect(outcome.status).toBe('cancelled');
    expect(MockGraphQLServer).toHaveBeenCalledWith(
      expect.objectContaining({
        api: {
          enableServicesApi: false,
          exposedSchemas: ['public', 'app_public'],
          anonRole: 'anonymous',
          roleName: 'authenticated',
        },
      }),
      expect.anything()
    );
  });

  it('keeps database selection and historical defaults in the human adapter', async () => {
    mockGetEnvOptions
      .mockReturnValueOnce({ pg: { database: 'postgres' } } as never)
      .mockReturnValueOnce({ pg: { database: 'postgres' } } as never);
    const query = jest.fn(async () => ({ rows: [{ datname: 'app' }] }));
    mockGetPgPool.mockReturnValue({ query } as never);
    const prompt = jest
      .fn()
      .mockResolvedValueOnce({ database: 'app' })
      .mockResolvedValueOnce({
        database: 'app',
        simpleInflection: true,
        oppositeBaseNames: false,
        postgis: true,
        servicesApi: true,
        port: 5555,
      });
    const hooks = createServiceHooks({ prompt } as unknown as Inquirerer);

    const collected = await hooks['server.start']?.collectInteractiveInput?.(
      {},
      {
        cwd: process.cwd(),
        env: {},
        signal: new AbortController().signal,
        operationId: 'interactive-test',
      }
    );

    expect(query).toHaveBeenCalledWith(expect.stringContaining('pg_database'));
    expect(mockGetPgPool).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ environment: {} })
    );
    expect(mockPromptPoolClose).toHaveBeenCalledTimes(1);
    expect(collected).toMatchObject({
      database: 'app',
      simpleInflection: true,
      oppositeBaseNames: false,
      postgis: true,
      servicesApi: true,
      port: 5555,
    });
  });

  it('maps port conflicts safely and redacts credentials from debug errors', async () => {
    const secret = 'database-password-that-must-not-leak';
    const failure = Object.assign(
      new Error(`failed using password ${secret}`),
      { code: 'EADDRINUSE' }
    );
    MockGraphQLServer.mockImplementation(
      () =>
        ({
          start: jest.fn(async (): Promise<never> => {
            throw failure;
          }),
          waitForFailure: unresolvedFailure,
          close: jest.fn(async (): Promise<void> => undefined),
        }) as never
    );

    const outcome = await executeCommand(
      commands,
      'server.start',
      {},
      {
        cwd: process.cwd(),
        mode: 'agent',
        env: { PGPASSWORD: secret },
        debug: true,
      }
    );

    expect(outcome).toMatchObject({
      status: 'failed',
      error: {
        code: 'SERVICE_PORT_IN_USE',
        details: { systemCode: 'EADDRINUSE' },
      },
    });
    expect(JSON.stringify(outcome)).not.toContain(secret);
  });

  it('redacts credentials resolved from the project config', async () => {
    const secret = 'config-file-password-that-must-not-leak';
    mockGetEnvOptions.mockReturnValueOnce({
      pg: {
        database: 'configured-app',
        password: secret,
      },
      cdn: {
        awsAccessKey: 'config-access-key',
        awsSecretKey: 'config-storage-secret',
      },
      api: { enableServicesApi: true, exposedSchemas: [] },
      features: {},
      server: { host: '127.0.0.1', port: 5555 },
    } as never);
    MockGraphQLServer.mockImplementation(
      () =>
        ({
          start: jest.fn(async (): Promise<never> => {
            throw new Error(
              `${secret} config-access-key config-storage-secret`
            );
          }),
          waitForFailure: unresolvedFailure,
          close: jest.fn(async (): Promise<void> => undefined),
        }) as never
    );

    const outcome = await executeCommand(
      commands,
      'server.start',
      {},
      {
        cwd: process.cwd(),
        mode: 'agent',
        env: {},
        debug: true,
      }
    );
    const serialized = JSON.stringify(outcome);

    expect(outcome).toMatchObject({
      status: 'failed',
      error: { code: 'SERVICE_START_FAILED' },
    });
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain('config-access-key');
    expect(serialized).not.toContain('config-storage-secret');
  });

  it.each(['0.0.0.0', '::'])(
    'reports a usable localhost URL when bound to %s',
    async (bindAddress) => {
      const controller = new AbortController();
      const server = new FakeHttpServer(bindAddress);
      MockGraphQLServer.mockImplementation(
        () =>
          ({
            start: jest.fn(async () => server as unknown as HttpServer),
            waitForFailure: unresolvedFailure,
            close: jest.fn(async (): Promise<void> => {
              server.close();
            }),
          }) as never
      );

      const { events } = await runUntilReady('server.start', {}, controller);

      expect(events).toContainEqual(
        expect.objectContaining({
          event: 'service.ready',
          url: 'http://localhost:43123',
        })
      );
    }
  );

  it.each(['service.starting', 'service.ready'] as const)(
    'closes the GraphQL server when %s delivery fails',
    async (failedEvent) => {
      const server = new FakeHttpServer();
      const close = jest.fn(async (): Promise<void> => {
        server.close();
      });
      MockGraphQLServer.mockImplementation(
        () =>
          ({
            start: jest.fn(async () => server as unknown as HttpServer),
            waitForFailure: unresolvedFailure,
            close,
          }) as never
      );

      const outcome = await executeCommand(
        commands,
        'server.start',
        {},
        {
          cwd: process.cwd(),
          mode: 'agent',
          env: {},
          sink: async (event) => {
            if (event.event === failedEvent) {
              throw new Error('event transport unavailable');
            }
          },
        }
      );

      expect(outcome).toMatchObject({
        status: 'failed',
        error: {
          code: 'CLI_PROTOCOL_SINK_FAILED',
          category: 'internal',
        },
      });
      expect(close).toHaveBeenCalledWith({ closeCaches: true });
    }
  );

  it('returns the explorer URL without exposing any browser-opening hook', async () => {
    const controller = new AbortController();
    const server = new FakeHttpServer();
    const close = jest.fn(async (): Promise<void> => {
      server.close();
    });
    mockStartExplorer.mockResolvedValue({
      app: {} as never,
      httpServer: server as unknown as HttpServer,
      url: 'http://127.0.0.1:43123',
      waitForFailure: unresolvedFailure,
      close,
    });

    const { outcome } = await runUntilReady('explorer.start', {}, controller, {
      EXPLICIT_SERVICE_VALUE: 'yes',
    });

    expect(outcome.status).toBe('cancelled');
    expect(mockStartExplorer).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        env: { EXPLICIT_SERVICE_VALUE: 'yes' },
        signal: controller.signal,
      })
    );
    const runtime = mockStartExplorer.mock.calls[0]?.[1];
    expect(runtime).not.toHaveProperty('openBrowser');
    expect(runtime).not.toHaveProperty('browser');
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('closes the explorer when protocol event delivery fails', async () => {
    const server = new FakeHttpServer();
    const close = jest.fn(async (): Promise<void> => {
      server.close();
    });
    mockStartExplorer.mockResolvedValue({
      app: {} as never,
      httpServer: server as unknown as HttpServer,
      url: 'http://127.0.0.1:43123',
      waitForFailure: unresolvedFailure,
      close,
    });

    const outcome = await executeCommand(
      commands,
      'explorer.start',
      {},
      {
        cwd: process.cwd(),
        mode: 'agent',
        env: {},
        sink: async (event) => {
          if (event.event === 'service.ready') {
            throw new Error('event transport unavailable');
          }
        },
      }
    );

    expect(outcome).toMatchObject({
      status: 'failed',
      error: {
        code: 'CLI_PROTOCOL_SINK_FAILED',
        category: 'internal',
      },
    });
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('passes only the operation cwd, environment, and signal into jobs', async () => {
    const controller = new AbortController();
    const stop = jest.fn(async (): Promise<void> => undefined);
    const log = new Logger('jobs-service-command-test');
    const stdout = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    const stderr = jest
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
    MockJobsService.mockImplementation(
      () =>
        ({
          start: jest.fn(async () => {
            log.info('this jobs log must not escape');
            log.error('this jobs log must not escape');
            return {
              jobs: false,
              functions: [{ name: 'send-email', port: 8081 }],
            };
          }),
          waitForFailure: unresolvedFailure,
          stop,
        }) as never
    );

    try {
      const { outcome } = await runUntilReady(
        'jobs.up',
        { functions: 'send-email=8081' },
        controller,
        { JOBS_SUPPORTED: 'send-email' }
      );

      expect(outcome.status).toBe('cancelled');
      expect(MockJobsService).toHaveBeenCalledWith(
        expect.objectContaining({
          runtime: {
            cwd: process.cwd(),
            env: { JOBS_SUPPORTED: 'send-email' },
            signal: controller.signal,
          },
        })
      );
      expect(stop).toHaveBeenCalledTimes(1);
      expect(stdout).not.toHaveBeenCalled();
      expect(stderr).not.toHaveBeenCalled();
    } finally {
      stdout.mockRestore();
      stderr.mockRestore();
    }
  });

  it('stops jobs when protocol event delivery fails', async () => {
    const stop = jest.fn(async (): Promise<void> => undefined);
    MockJobsService.mockImplementation(
      () =>
        ({
          start: jest.fn(async () => ({
            jobs: false,
            functions: [{ name: 'send-email', port: 8081 }],
          })),
          waitForFailure: unresolvedFailure,
          stop,
        }) as never
    );

    const outcome = await executeCommand(
      commands,
      'jobs.up',
      { functions: 'send-email=8081' },
      {
        cwd: process.cwd(),
        mode: 'agent',
        env: {},
        sink: async (event) => {
          if (event.event === 'service.ready') {
            throw new Error('event transport unavailable');
          }
        },
      }
    );

    expect(outcome).toMatchObject({
      status: 'failed',
      error: {
        code: 'CLI_PROTOCOL_SINK_FAILED',
        category: 'internal',
      },
    });
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('rejects unknown and duplicate function declarations before startup', () => {
    expect(() => parseFunctions('made-up=8081')).toThrow(
      expect.objectContaining({ code: 'JOBS_FUNCTION_UNKNOWN' })
    );
    expect(() => parseFunctions('send-email=8081,send-email=8082')).toThrow(
      expect.objectContaining({ code: 'JOBS_FUNCTION_DUPLICATE' })
    );
  });
});
