/**
 * Graphile build and cache lifecycle integration tests.
 *
 * These tests use the scoped routing fixture and a real HTTP server. The
 * caller plugins only control the Graphile build boundary; they do not mock
 * any Constructive cache or middleware internals.
 */

import type { GraphileOptions } from '@constructive-io/graphql-types';
import {
  beginGraphileBuildShutdown,
  clearGraphileCache,
  configureGraphileBuilds,
  graphileCache,
  reopenGraphileBuilds
} from 'graphile-cache';
import path from 'path';
import type supertest from 'supertest';

import { getConnections, seed } from '../src';

jest.setTimeout(120000);

const sharedSeedRoot = path.join(__dirname, '..', '..', '..', '__fixtures__', 'seed');
const shared = (...segments: string[]) => path.join(sharedSeedRoot, ...segments);
const pgpmWorkspace = path.join(sharedSeedRoot, '..', '..');
const schemas = ['simple-pets-public', 'simple-pets-pets-public'];
const scopedMetaSchemas = [
  'catalog_private',
  'routing_public',
  'apps_public',
  'metaschema_public',
  'metaschema_modules_public'
];
const appHost = 'app.test.constructive.io';
const flushToken = 'f17-flush-secret';
const secretBuildMessage = 'f17-private-build-marker';
const animalsQuery = '{ animals { nodes { name species } } }';

const scopedSeedAdapters = () => [
  seed.pgpm(pgpmWorkspace),
  seed.sqlfile([
    shared('app-schemas', 'simple-pets', 'schema.sql'),
    shared('scoped', 'test-data.sql'),
    shared('app-schemas', 'simple-pets', 'test-data.sql')
  ])
];

/** Keep build failures from entering Graphile's upstream retry loop. */
const graphileOptions = (plugin?: unknown): GraphileOptions =>
  ({
    preset: {
      schema: { retryOnInitFail: false },
      ...(plugin ? { plugins: [plugin] } : {})
    }
  } as unknown as GraphileOptions);

interface BuildControl {
  plugin: unknown;
  entered: Promise<void>;
  release(): void;
  buildCount(): number;
}

interface AnimalsResponseBody {
  data?: {
    animals?: {
      nodes?: Array<{ name: string }>;
    };
  };
}

const createBuildControl = (
  onFirstBuild: () => Promise<void> | void = async () => undefined
): BuildControl => {
  let builds = 0;
  let resolveEntered!: () => void;
  let resolveGate!: () => void;
  const entered = new Promise<void>((resolve) => {
    resolveEntered = resolve;
  });
  const gate = new Promise<void>((resolve) => {
    resolveGate = resolve;
  });

  const plugin = {
    name: 'F17GraphileBuildTestPlugin',
    gather: {
      namespace: 'f17GraphileBuildTest',
      main: async () => {
        builds += 1;
        resolveEntered();
        await onFirstBuild();
        await gate;
      }
    }
  };

  return {
    plugin,
    entered,
    release: () => resolveGate(),
    buildCount: () => builds
  };
};

const createFailOnceBuildControl = (): BuildControl => {
  let builds = 0;
  let resolveEntered!: () => void;
  let resolveGate!: () => void;
  const entered = new Promise<void>((resolve) => {
    resolveEntered = resolve;
  });
  const gate = new Promise<void>((resolve) => {
    resolveGate = resolve;
  });

  const plugin = {
    name: 'F17GraphileBuildFailOnceTestPlugin',
    gather: {
      namespace: 'f17GraphileBuildFailOnceTest',
      main: async () => {
        builds += 1;
        if (builds === 1) {
          resolveEntered();
          await gate;
          throw new Error(secretBuildMessage);
        }
      }
    }
  };

  return {
    plugin,
    entered,
    release: () => resolveGate(),
    buildCount: () => builds
  };
};

const waitForSignal = async (
  signal: Promise<void>,
  label: string,
  timeoutMs = 90000
): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timed out waiting for ${label}`));
    }, timeoutMs);
    signal.then(
      () => {
        clearTimeout(timer);
        resolve();
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
};

const nextTurn = (): Promise<void> =>
  new Promise((resolve) => setImmediate(resolve));

// SuperTest starts the socket when `.then()` is called, but the request still
// has to traverse the real routing/context middleware before it can observe
// the in-flight build. Give that second request a bounded event-loop window
// while the first caller remains held by the plugin gate.
const allowConcurrentRequestToReachGraphile = async (): Promise<void> => {
  await nextTurn();
  await new Promise<void>((resolve) => setTimeout(resolve, 500));
};

describe('Graphile build and cache over the real scoped HTTP server', () => {
  let request: supertest.Agent | undefined;
  let teardown: (() => Promise<void>) | undefined;
  let transactionCleanup: (() => Promise<void>) | undefined;
  let releaseBuild: (() => void) | undefined;
  const pendingRequests = new Set<Promise<unknown>>();

  const trackRequest = <T>(promise: Promise<T>): Promise<T> => {
    pendingRequests.add(promise);
    promise.then(
      () => pendingRequests.delete(promise),
      () => pendingRequests.delete(promise)
    );
    return promise;
  };

  const startServer = async (plugin?: unknown, token?: string): Promise<void> => {
    const connection = await getConnections(
      {
        schemas,
        authRole: 'anonymous',
        graphile: graphileOptions(plugin),
        server: {
          useRouting: true,
          api: {
            isPublic: true,
            metaSchemas: scopedMetaSchemas,
            ...(token ? { flushToken: token } : {})
          }
        }
      },
      scopedSeedAdapters()
    );
    request = connection.request;
    teardown = connection.teardown;
    transactionCleanup = async () => {
      try {
        await connection.db.afterEach();
      } finally {
        await connection.pg.afterEach();
      }
    };
    await connection.pg.beforeEach();
    await connection.db.beforeEach();
  };

  const postGraphQL = () => {
    if (!request) throw new Error('Test server has not started');
    const test = request
      .post('/graphql')
      .set('Host', appHost)
      .send({ query: animalsQuery });
    return trackRequest(test.then((response) => response));
  };

  const flush = (method: 'get' | 'post', authorization?: string) => {
    if (!request) throw new Error('Test server has not started');
    let req = (method === 'get' ? request.get('/flush') : request.post('/flush'))
      .set('Host', appHost);
    if (authorization !== undefined) req = req.set('Authorization', authorization);
    return trackRequest(req.then((response) => response));
  };

  const expectAnimals = (response: { status: number; body: AnimalsResponseBody }): void => {
    expect(response.status).toBe(200);
    const nodes = response.body.data?.animals?.nodes;
    expect(nodes).toBeDefined();
    const names = nodes!.map(
      (node: { name: string }) => node.name
    );
    expect(names).toEqual(
      expect.arrayContaining(['Buddy', 'Max', 'Whiskers', 'Mittens', 'Tweety'])
    );
  };

  beforeEach(async () => {
    await clearGraphileCache();
  });

  afterEach(async () => {
    releaseBuild?.();
    releaseBuild = undefined;
    const pending = [...pendingRequests];
    const currentTeardown = teardown;
    const currentTransactionCleanup = transactionCleanup;
    teardown = undefined;
    transactionCleanup = undefined;
    request = undefined;
    try {
      try {
        await waitForSignal(
          Promise.allSettled(pending).then((): void => undefined),
          'HTTP requests to finish',
          15000
        );
      } finally {
        pendingRequests.clear();
      }
      try {
        // Drain schema handlers before pgsql-test rolls back and drops the
        // fixture database. The server's close path also drains this cache, but
        // the explicit ordering keeps failed tests from poisoning teardown.
        await clearGraphileCache();
      } finally {
        await currentTransactionCleanup?.();
      }
    } finally {
      await currentTeardown?.();
    }
  });

  it('serves the seeded schema through scoped routing', async () => {
    await startServer();

    expectAnimals(await postGraphQL());
  });

  it('coalesces concurrent requests while a caller plugin defers schema build', async () => {
    const control = createBuildControl();
    releaseBuild = control.release;
    await startServer(control.plugin);

    const first = postGraphQL();
    await waitForSignal(control.entered, 'the deferred Graphile build');

    const second = postGraphQL();
    await allowConcurrentRequestToReachGraphile();
    expect(control.buildCount()).toBe(1);

    control.release();
    releaseBuild = undefined;
    const [firstResponse, secondResponse] = await Promise.all([first, second]);
    expectAnimals(firstResponse);
    expectAnimals(secondResponse);
    expect(control.buildCount()).toBe(1);
  });

  it('maps a failed build to a safe HTTP error and retries after coalescing ends', async () => {
    const control = createFailOnceBuildControl();
    releaseBuild = control.release;
    await startServer(control.plugin);

    const first = postGraphQL();
    await waitForSignal(control.entered, 'the failing Graphile build');

    const second = postGraphQL();
    await allowConcurrentRequestToReachGraphile();
    expect(control.buildCount()).toBe(1);

    control.release();
    releaseBuild = undefined;
    const [firstResponse, secondResponse] = await Promise.all([first, second]);
    for (const response of [firstResponse, secondResponse]) {
      expect(response.status).toBe(500);
      expect(response.body.errors[0].extensions).toMatchObject({
        code: 'INTERNAL_FAILURE',
        http: 500
      });
      expect(JSON.stringify(response.body)).not.toContain(secretBuildMessage);
    }

    // The failed generation must be removed from the in-flight map. A later
    // request gets a fresh build, which this plugin allows to complete.
    expectAnimals(await postGraphQL());
    expect(control.buildCount()).toBe(2);
  });

  it('clears the real service cache for authenticated POST and GET flushes', async () => {
    const control = createBuildControl(async () => undefined);
    releaseBuild = control.release;
    control.release();
    await startServer(control.plugin, flushToken);

    expectAnimals(await postGraphQL());
    expect(control.buildCount()).toBe(1);

    const postFlush = await flush('post', `Bearer ${flushToken}`);
    expect(postFlush.status).toBe(200);
    expect(postFlush.text).toBe('OK');
    expect(graphileCache.size).toBe(0);
    expectAnimals(await postGraphQL());
    expect(control.buildCount()).toBe(2);

    const getFlush = await flush('get', `Bearer ${flushToken}`);
    expect(getFlush.status).toBe(200);
    expect(getFlush.text).toBe('OK');
    expect(graphileCache.size).toBe(0);
  });

  it('rejects missing and wrong flush tokens without clearing the service cache', async () => {
    const control = createBuildControl(async () => undefined);
    releaseBuild = control.release;
    control.release();
    await startServer(control.plugin, flushToken);

    expectAnimals(await postGraphQL());
    expect(control.buildCount()).toBe(1);

    expect((await flush('post')).status).toBe(401);
    expect((await flush('get', 'Bearer wrong-token')).status).toBe(401);
    expectAnimals(await postGraphQL());
    expect(control.buildCount()).toBe(1);
  });

  it('passes an unrelated health request without building Graphile', async () => {
    const control = createBuildControl(async () => undefined);
    releaseBuild = control.release;
    await startServer(control.plugin, flushToken);

    if (!request) throw new Error('Test server has not started');
    const response = await trackRequest(
      request.get('/healthz').set('Host', appHost).then((result) => result)
    );
    expect(response.status).toBe(200);
    expect(control.buildCount()).toBe(0);

    beginGraphileBuildShutdown();
    const closedResponse = await postGraphQL();
    expect(closedResponse.status).toBe(503);
    expect(closedResponse.body).toEqual({
      errors: [{
        message: 'Schema builds are closed.',
        extensions: {
          code: 'SCHEMA_BUILDS_CLOSED',
          class: 'internal',
          http: 503
        }
      }]
    });
    expect(control.buildCount()).toBe(0);

    // Restore the process-wide coordinator before this server is torn down;
    // the next server owner also configures the coordinator during startup.
    reopenGraphileBuilds();
    configureGraphileBuilds();
  });

  it('keeps flush closed when no token is configured', async () => {
    await startServer();

    expect((await flush('post', `Bearer ${flushToken}`)).status).toBe(404);
  });
});
