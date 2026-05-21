/**
 * E2E integration test: generated React hooks + ORM client + PostGraphile +
 * graphql-ws + pg LISTEN/NOTIFY.
 *
 * Companion to realtime-orm-client.integration.test.ts. Exercises the layers
 * that were previously only snapshot-tested or mocked:
 *
 *   1. React hook `useContactSubscription` (delegates through ORM → WS → PG)
 *   2. `client.contact.events()` AsyncIterableIterator (abort-driven cleanup)
 *   3. `client.realtime.onConnectionStateChange` replay-on-subscribe semantics
 *   4. `client.realtime.close()` shutdown contract (final closed event +
 *      activeSubscriptionCount → 0)
 *   5. Hook `enabled: false` guard
 *
 * All tests share one `getConnections()` boot and one tsc compile to keep
 * wall time bounded. See the sibling ORM test for the rationale behind
 * InjectWithPgClientPlugin / pgPool-committed-writes.
 */
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createClient as createWsClient } from 'graphql-ws';
import { QueryClient } from '@tanstack/react-query';
import { WebSocket } from 'ws';
import { seed } from 'pgsql-test';
import { withPgClientFromPgService } from 'graphile-build-pg';
import type { GraphileConfig } from 'graphile-config';

import { getConnections } from 'graphile-realtime-test';
import type { GetConnectionsResult } from 'graphile-realtime-test';
import { generateOrm } from '@constructive-io/graphql-codegen/core/codegen/orm';
import { generate as generateHooks } from '@constructive-io/graphql-codegen/core/codegen';
import type {
  FieldType,
  Relations,
  Table,
} from '@constructive-io/graphql-codegen/types/schema';

import { renderHookWithClient } from './hook-test-utils';

let pgServiceForTest: GetConnectionsResult['pgService'] | null = null;

const InjectWithPgClientPlugin: GraphileConfig.Plugin = {
  name: 'InjectWithPgClientForSubscriptions',
  version: '0.0.1',
  grafast: {
    middleware: {
      subscribe(next, event) {
        const ctx = event.args.contextValue as
          | Record<string, unknown>
          | null
          | undefined;
        if (pgServiceForTest && ctx != null) {
          const withPgClientKey: string =
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (pgServiceForTest as any).withPgClientKey ?? 'withPgClient';
          if (!(withPgClientKey in ctx)) {
            ctx[withPgClientKey] = withPgClientFromPgService.bind(
              null,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              pgServiceForTest as any,
            );
          }
        }
        return next();
      },
    },
  },
};

const fieldTypes = {
  uuid: { gqlType: 'UUID', isArray: false } as FieldType,
  string: { gqlType: 'String', isArray: false } as FieldType,
};

const emptyRelations: Relations = {
  belongsTo: [],
  hasOne: [],
  hasMany: [],
  manyToMany: [],
};

const contactTable: Table = {
  name: 'Contact',
  fields: [
    { name: 'rowId', type: fieldTypes.uuid },
    { name: 'name', type: fieldTypes.string },
  ],
  relations: emptyRelations,
  constraints: {
    primaryKey: [
      { name: 'contacts_pkey', fields: [{ name: 'rowId', type: fieldTypes.uuid }] },
    ],
    foreignKey: [],
    unique: [],
  },
  query: {
    all: 'contacts',
    one: 'contact',
    create: 'createContact',
    update: 'updateContact',
    delete: 'deleteContact',
  },
  subscription: {
    fieldName: 'onContactChanged',
    payloadTypeName: 'ContactSubscriptionPayload',
    rowFieldName: 'contact',
    payloadMetaFields: ['event', 'rowId', 'overflow'],
    args: [
      {
        name: 'ids',
        type: {
          kind: 'LIST',
          name: null,
          ofType: {
            kind: 'NON_NULL',
            name: null,
            ofType: { kind: 'SCALAR', name: 'UUID' },
          },
        },
      },
    ],
  },
};

const codegenConfig = {
  tables: { include: [], exclude: [], systemExclude: [] },
  queries: { include: [], exclude: [], systemExclude: [] },
  mutations: { include: [], exclude: [], systemExclude: [] },
  codegen: { skipQueryField: false },
  reactQuery: true,
} as const as Parameters<typeof generateHooks>[0]['config'];

const ormConfig = {
  ...codegenConfig,
  reactQuery: false,
} as Parameters<typeof generateOrm>[0]['config'];

function writeFile(root: string, relativePath: string, content: string): void {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

interface BuiltGenerated {
  createClient: CallableFunction;
  configure: (config: unknown) => void;
  getClient: () => unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useContactSubscription: (options: any) => void;
}

function buildGenerated(tmpdir: string): BuiltGenerated {
  const orm = generateOrm({ tables: [contactTable], config: ormConfig });
  const hooks = generateHooks({ tables: [contactTable], config: codegenConfig });

  const codegenNodeModules = path.join(
    __dirname,
    '../../../graphql/codegen/node_modules',
  );
  fs.symlinkSync(codegenNodeModules, path.join(tmpdir, 'node_modules'), 'dir');

  for (const file of orm.files) {
    writeFile(tmpdir, path.join('src/orm', file.path), file.content);
  }
  for (const file of hooks.files) {
    writeFile(tmpdir, path.join('src/hooks', file.path), file.content);
  }

  const srcDir = path.join(tmpdir, 'src');
  const outDir = path.join(tmpdir, 'out');

  const tsconfig = {
    compilerOptions: {
      target: 'ES2022',
      module: 'CommonJS',
      moduleResolution: 'Node',
      esModuleInterop: true,
      strict: true,
      strictNullChecks: false,
      skipLibCheck: true,
      jsx: 'react',
      outDir,
    },
    include: [`${srcDir}/**/*.ts`, `${srcDir}/**/*.tsx`],
  };
  writeFile(tmpdir, 'tsconfig.json', JSON.stringify(tsconfig, null, 2));

  const tscBin = path.join(codegenNodeModules, '.bin', 'tsc');
  try {
    execFileSync(tscBin, ['-p', path.join(tmpdir, 'tsconfig.json')], {
      cwd: tmpdir,
      stdio: 'pipe',
    });
  } catch (error) {
    const err = error as {
      stdout?: Buffer;
      stderr?: Buffer;
      message?: string;
    };
    const details =
      `${err.stdout?.toString() ?? ''}${err.stderr?.toString() ?? ''}`.trim();
    throw new Error(
      `tsc compilation failed:\n${details !== '' ? details : err.message ?? 'unknown'}`,
    );
  }

  const ormMod = require(path.join(outDir, 'orm', 'index.js')) as {
    createClient: CallableFunction;
  };
  const hooksMod = require(path.join(outDir, 'hooks', 'index.js')) as {
    configure: (config: unknown) => void;
    getClient: () => unknown;
  };
  const subMod = require(
    path.join(outDir, 'hooks', 'subscriptions', 'useContactSubscription.js'),
  ) as { useContactSubscription: (options: unknown) => void };

  return {
    createClient: ormMod.createClient,
    configure: hooksMod.configure,
    getClient: hooksMod.getClient,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useContactSubscription: subMod.useContactSubscription as (options: any) => void,
  };
}

interface SubscriptionEvent {
  operation: string;
  rowId: string | null;
  overflow: boolean;
  data: { rowId: string; name: string } | null;
}

interface ConnectionState {
  status: string;
  code?: number;
  reason?: string;
  wasClean?: boolean;
}

interface RealtimeNamespace {
  readonly connectionState: ConnectionState;
  readonly isEnabled: boolean;
  readonly activeSubscriptionCount: number;
  onConnectionStateChange: (listener: (state: ConnectionState) => void) => () => void;
  close: () => void;
}

interface ContactModel {
  subscribe: (opts: {
    select: Record<string, boolean>;
    ids?: string[];
    onEvent: (event: SubscriptionEvent) => void;
    onError?: (error: Error) => void;
    onComplete?: () => void;
  }) => () => void;
  events: (args: {
    select: Record<string, boolean>;
    ids?: string[];
    signal?: AbortSignal;
  }) => AsyncIterableIterator<SubscriptionEvent>;
}

interface OrmClient {
  contact: ContactModel;
  realtime: RealtimeNamespace;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor<T>(
  fn: () => T | undefined,
  timeoutMs = 8000,
  intervalMs = 50,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const v = fn();
    if (v !== undefined && v !== null && v !== false) {
      return v as T;
    }
    await sleep(intervalMs);
  }
  throw new Error(`Timed out after ${timeoutMs}ms`);
}

describe('realtime React hooks E2E (generated SDK + PostGraphile + graphql-ws)', () => {
  let ctx: GetConnectionsResult;
  let tmpdir: string;
  let built: BuiltGenerated;

  beforeAll(async () => {
    ctx = await getConnections(
      {
        schemas: ['realtime_codegen_test'],
        realtimeTables: ['contact'],
        preset: { plugins: [InjectWithPgClientPlugin] },
      },
      [seed.sqlfile([path.join(__dirname, '../sql/contact-seed.sql')])],
    );
    pgServiceForTest = ctx.pgService;

    tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'realtime-react-e2e-'));
    built = buildGenerated(tmpdir);
  }, 90000);

  afterAll(async () => {
    if (ctx) await ctx.teardown();
    if (tmpdir) fs.rmSync(tmpdir, { recursive: true, force: true });
    pgServiceForTest = null;
  }, 15000);

  it('React hook receives UPDATE event end-to-end', async () => {
    const contactId = randomUUID();
    const pgClient = await ctx.pgPool.connect();
    await pgClient.query(
      'INSERT INTO realtime_codegen_test.contact (id, name) VALUES ($1, $2)',
      [contactId, 'Alice'],
    );
    pgClient.release();

    const wsClient = createWsClient({
      url: ctx.ws.serverUrl,
      webSocketImpl: WebSocket,
      retryAttempts: 0,
    });

    built.configure({
      endpoint: ctx.ws.serverUrl.replace('ws://', 'http://'),
      realtime: { client: wsClient },
    });

    const collected: SubscriptionEvent[] = [];
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const harness = await renderHookWithClient(
      () =>
        built.useContactSubscription({
          select: { rowId: true, name: true },
          ids: [contactId],
          onEvent: (event: SubscriptionEvent) => {
            collected.push(event);
          },
        }),
      queryClient,
    );

    await sleep(300);
    await ctx.notifyChange(
      'contact',
      'UPDATE',
      [contactId],
      'realtime_codegen_test',
    );

    // useContactSubscription returns void — assert on the closure-side
    // collector, not on hook state. harness.waitFor probes hook state and
    // would fail because latestResult is undefined for a void hook.
    await waitFor(() => collected.length > 0, 8000);

    expect(collected[0].operation).toBe('UPDATE');
    expect(collected[0].overflow).toBe(false);
    expect(collected[0].data).not.toBeNull();
    expect(collected[0].data?.name).toBe('Alice');

    await harness.unmount();
    (built.getClient() as OrmClient).realtime.close();
    await wsClient.dispose();

    const cleanup = await ctx.pgPool.connect();
    await cleanup.query(
      'DELETE FROM realtime_codegen_test.contact WHERE id = $1',
      [contactId],
    );
    cleanup.release();
  }, 30000);

  it('React hook stops delivering events after unmount', async () => {
    const wsClient = createWsClient({
      url: ctx.ws.serverUrl,
      webSocketImpl: WebSocket,
      retryAttempts: 0,
    });
    built.configure({
      endpoint: ctx.ws.serverUrl.replace('ws://', 'http://'),
      realtime: { client: wsClient },
    });

    const collected: SubscriptionEvent[] = [];
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const harness = await renderHookWithClient(
      () =>
        built.useContactSubscription({
          select: { rowId: true },
          onEvent: (event: SubscriptionEvent) => {
            collected.push(event);
          },
        }),
      queryClient,
    );

    await sleep(300);
    await harness.unmount();

    await ctx.notifyChange(
      'contact',
      'INSERT',
      [randomUUID()],
      'realtime_codegen_test',
    );
    await sleep(500);

    expect(collected).toHaveLength(0);

    (built.getClient() as OrmClient).realtime.close();
    await wsClient.dispose();
  }, 30000);

  it('events() AsyncIterableIterator yields then ends on abort', async () => {
    const wsClient = createWsClient({
      url: ctx.ws.serverUrl,
      webSocketImpl: WebSocket,
      retryAttempts: 0,
    });
    const ormClient = built.createClient({
      endpoint: ctx.ws.serverUrl.replace('ws://', 'http://'),
      realtime: { client: wsClient },
    }) as OrmClient;

    const controller = new AbortController();
    const iter = ormClient.contact.events({
      select: { rowId: true },
      signal: controller.signal,
    });

    const collected: SubscriptionEvent[] = [];
    const loop = (async () => {
      for await (const ev of iter) {
        collected.push(ev);
      }
    })();

    await sleep(300);
    await ctx.notifyInvalidate('contact', 'realtime_codegen_test');

    await waitFor(() => collected.length > 0, 8000);
    expect(collected[0].operation).toBe('INVALIDATE');

    controller.abort();
    await expect(loop).resolves.toBeUndefined();

    ormClient.realtime.close();
    await wsClient.dispose();
  }, 30000);

  it('onConnectionStateChange replays current state on subscribe', async () => {
    const wsClient = createWsClient({
      url: ctx.ws.serverUrl,
      webSocketImpl: WebSocket,
      retryAttempts: 0,
    });
    const ormClient = built.createClient({
      endpoint: ctx.ws.serverUrl.replace('ws://', 'http://'),
      realtime: { client: wsClient },
    }) as OrmClient;

    // Force the WS to connect by issuing a subscription
    const unsubProbe = ormClient.contact.subscribe({
      select: { rowId: true },
      onEvent: () => {},
    });
    await waitFor(
      () => ormClient.realtime.connectionState.status === 'connected',
      8000,
    );

    // Register the listener AFTER connection is established and assert replay
    const received: ConnectionState[] = [];
    const unsubListener = ormClient.realtime.onConnectionStateChange((state) => {
      received.push(state);
    });

    expect(received).toHaveLength(1);
    expect(received[0].status).toBe('connected');

    unsubListener();
    unsubProbe();
    ormClient.realtime.close();
    await wsClient.dispose();
  }, 30000);

  it('close() emits final {status:closed, code:1000} and clears subscriptions', async () => {
    const wsClient = createWsClient({
      url: ctx.ws.serverUrl,
      webSocketImpl: WebSocket,
      retryAttempts: 0,
    });
    const ormClient = built.createClient({
      endpoint: ctx.ws.serverUrl.replace('ws://', 'http://'),
      realtime: { client: wsClient },
    }) as OrmClient;

    const unsubscribe = ormClient.contact.subscribe({
      select: { rowId: true },
      onEvent: () => {},
    });
    await waitFor(
      () => ormClient.realtime.connectionState.status === 'connected',
      8000,
    );
    expect(ormClient.realtime.activeSubscriptionCount).toBe(1);

    const received: ConnectionState[] = [];
    ormClient.realtime.onConnectionStateChange((state) => {
      received.push(state);
    });

    ormClient.realtime.close();

    const final = received[received.length - 1];
    expect(final.status).toBe('closed');
    expect(final.code).toBe(1000);
    expect(ormClient.realtime.activeSubscriptionCount).toBe(0);

    unsubscribe(); // safe to call after close — should be a no-op
    await wsClient.dispose();
  }, 30000);

  it('enabled: false prevents subscription setup', async () => {
    const wsClient = createWsClient({
      url: ctx.ws.serverUrl,
      webSocketImpl: WebSocket,
      retryAttempts: 0,
    });
    built.configure({
      endpoint: ctx.ws.serverUrl.replace('ws://', 'http://'),
      realtime: { client: wsClient },
    });

    const collected: SubscriptionEvent[] = [];
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const harness = await renderHookWithClient(
      () =>
        built.useContactSubscription({
          select: { rowId: true },
          enabled: false,
          onEvent: (event: SubscriptionEvent) => {
            collected.push(event);
          },
        }),
      queryClient,
    );

    await sleep(300);
    await ctx.notifyChange(
      'contact',
      'INSERT',
      [randomUUID()],
      'realtime_codegen_test',
    );
    await sleep(500);

    expect(collected).toHaveLength(0);
    expect((built.getClient() as OrmClient).realtime.activeSubscriptionCount).toBe(0);

    await harness.unmount();
    (built.getClient() as OrmClient).realtime.close();
    await wsClient.dispose();
  }, 30000);
});
