/**
 * E2E integration test: generated ORM client + PostGraphile + graphql-ws + pg LISTEN/NOTIFY.
 *
 * Flow:
 *   1. getConnections() boots a real PostgreSQL database (via pgsql-test),
 *      builds a GraphQL schema with RealtimeSubscriptionsPlugin, and starts
 *      a standalone HTTP + WebSocket server.
 *   2. generateOrm() produces the typed ORM client source files for the
 *      contact table.
 *   3. We write the generated files into a tmpdir, symlink node_modules from
 *      graphql/codegen (which has all runtime deps), compile to JS with tsc,
 *      and require() the output.
 *   4. We create an ORM client wired to the test WS server and call
 *      client.contact.subscribe() — the path from generated SDK all the
 *      way to real PostgreSQL NOTIFY.
 *
 * Architecture notes:
 *
 * Why we inject withPgClient via a preset plugin:
 *   graphile-realtime-test's WS server pre-injects pgSubscriber into the
 *   grafast contextValue. PgContextPlugin (which normally injects both
 *   pgSubscriber AND withPgClient for queries) only runs in the prepareArgs
 *   middleware hook — which is NOT called for subscription operations. For
 *   subscriptions, grafast uses the subscribe hook instead. We register a
 *   custom plugin that injects withPgClient in the subscribe middleware so
 *   the row data resolver (resource.get()) can execute DB queries.
 *
 * Why we use ctx.pgPool to insert rows (not ctx.pg.client):
 *   ctx.pg.client is a pgsql-test transactional client — its writes are NOT
 *   committed until after the test. PostGraphile's row resolver fetches the
 *   row in a separate connection and cannot see uncommitted rows. Using
 *   ctx.pgPool.connect() gives a non-transactional connection whose writes
 *   are immediately committed and visible to other connections.
 *
 * Why no emit_change trigger:
 *   The constructive-db emit_change PL/pgSQL trigger lives outside this
 *   monorepo. Events are simulated via ctx.notifyChange(), which calls
 *   pg_notify() on the root pg client (outside any transaction).
 *
 * These tests are NOT run in CI — they require a live PostgreSQL instance.
 * Run locally: pgpm docker start --image pyramation/postgres:17 --recreate
 *              && eval "$(pgpm env)" && pnpm test
 */

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createClient as createWsClient } from 'graphql-ws';
import { WebSocket } from 'ws';
import { seed } from 'pgsql-test';
import { withPgClientFromPgService } from 'graphile-build-pg';
import type { GraphileConfig } from 'graphile-config';

import { getConnections } from 'graphile-realtime-test';
import type { GetConnectionsResult } from 'graphile-realtime-test';
import { generateOrm } from '@constructive-io/graphql-codegen/core/codegen/orm';
import type { FieldType, Relations, Table } from '@constructive-io/graphql-codegen/types/schema';

// ─── PostGraphile preset plugin ────────────────────────────────────────────
//
// graphile-realtime-test's WS server pre-injects pgSubscriber into contextValue.
// PgContextPlugin only runs in prepareArgs (queries/mutations) — NOT for
// subscriptions. This plugin injects withPgClient in the subscribe middleware
// so the row resolver can execute DB queries during subscription events.

let pgServiceForTest: GetConnectionsResult['pgService'] | null = null;

const InjectWithPgClientPlugin: GraphileConfig.Plugin = {
  name: 'InjectWithPgClientForSubscriptions',
  version: '0.0.1',
  grafast: {
    middleware: {
      subscribe(next, event) {
        const ctx = event.args.contextValue as Record<string, unknown> | null | undefined;
        if (pgServiceForTest && ctx != null) {
          // withPgClientKey is a runtime property added by @dataplan/pg's makePgService
          // but is not present in the GraphileConfig.PgServiceConfiguration declaration
          // available to this package. The property is always a string, defaulting to
          // 'withPgClient' when absent.
          const withPgClientKey: string =
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (pgServiceForTest as any).withPgClientKey ?? 'withPgClient';
          if (!(withPgClientKey in ctx)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ctx[withPgClientKey] = withPgClientFromPgService.bind(null, pgServiceForTest as any);
          }
        }
        return next();
      },
    },
  },
};

// ─── Table fixture ──────────────────────────────────────────────────────────
//
// Note: PostGraphile v5 with NodePlugin disabled maps the UUID PK column `id`
// to a GraphQL field named `rowId` (not `id`). This fixture matches the actual
// schema emitted by the test server.

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
    primaryKey: [{ name: 'contacts_pkey', fields: [{ name: 'rowId', type: fieldTypes.uuid }] }],
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

const ormConfig = {
  tables: { include: [], exclude: [], systemExclude: [] },
  queries: { include: [], exclude: [], systemExclude: [] },
  mutations: { include: [], exclude: [], systemExclude: [] },
  codegen: { skipQueryField: false },
  reactQuery: false,
} as const as Parameters<typeof generateOrm>[0]['config'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function writeFile(root: string, relativePath: string, content: string): void {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

/**
 * Compile generated ORM files into a tmpdir and require the resulting
 * createClient factory.
 *
 * Mirrors subscription-compile.test.ts: symlinks graphql/codegen/node_modules
 * so that generated files can resolve gql-ast, graphql, and
 * @constructive-io/graphql-query/runtime. Compiles with outDir so we can
 * require() the output.
 */
function buildGeneratedClient(tmpdir: string): { createClient: CallableFunction } {
  const orm = generateOrm({ tables: [contactTable], config: ormConfig });

  // Symlink node_modules from the graphql/codegen package so that generated
  // files can resolve gql-ast, graphql, @constructive-io/graphql-query/runtime,
  // and other runtime deps used by query-builder.ts and client.ts.
  // This mirrors the approach used in subscription-compile.test.ts exactly.
  const codegenNodeModules = path.join(
    __dirname,
    '../../../graphql/codegen/node_modules',
  );
  fs.symlinkSync(codegenNodeModules, path.join(tmpdir, 'node_modules'), 'dir');

  // Write ORM source files
  for (const file of orm.files) {
    writeFile(tmpdir, path.join('src', file.path), file.content);
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
      outDir,
    },
    include: [`${srcDir}/**/*.ts`],
  };

  writeFile(tmpdir, 'tsconfig.json', JSON.stringify(tsconfig, null, 2));

  const tscBin = path.join(codegenNodeModules, '.bin', 'tsc');

  try {
    execFileSync(tscBin, ['-p', path.join(tmpdir, 'tsconfig.json')], {
      cwd: tmpdir,
      stdio: 'pipe',
    });
  } catch (error) {
    const err = error as { stdout?: Buffer; stderr?: Buffer; message?: string };
    const stdout = err.stdout?.toString() ?? '';
    const stderr = err.stderr?.toString() ?? '';
    const details = `${stdout}${stderr}`.trim();
    throw new Error(`tsc compilation failed:\n${details !== '' ? details : (err.message ?? 'unknown')}`);
  }

  // The generated createClient factory lives in index.ts → out/index.js
  const indexPath = path.join(outDir, 'index.js');
  const mod = require(indexPath) as { createClient: CallableFunction };
  return { createClient: mod.createClient };
}

// ─── Test suite ──────────────────────────────────────────────────────────────

describe('realtime ORM client E2E (generated SDK + PostGraphile + graphql-ws)', () => {
  let ctx: GetConnectionsResult;
  let tmpdir: string;
  let createClient: CallableFunction;

  beforeAll(async () => {
    ctx = await getConnections(
      {
        schemas: ['realtime_codegen_test'],
        realtimeTables: ['contact'],
        // Inject withPgClient via subscribe middleware so row data is
        // available to the subscription resolver (see module-level comment).
        preset: { plugins: [InjectWithPgClientPlugin] },
      },
      [seed.sqlfile([path.join(__dirname, '../sql/contact-seed.sql')])],
    );

    // Set the pgService reference AFTER getConnections resolves
    pgServiceForTest = ctx.pgService;

    tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'realtime-e2e-'));
    const built = buildGeneratedClient(tmpdir);
    createClient = built.createClient;
  }, 60000);

  afterAll(async () => {
    if (ctx) {
      await ctx.teardown();
    }
    if (tmpdir) {
      fs.rmSync(tmpdir, { recursive: true, force: true });
    }
    pgServiceForTest = null;
  }, 15000);

  // ─── Test 1: UPDATE event delivered end-to-end ──────────────────────────

  it('receives an UPDATE event end-to-end via generated ORM client', async () => {
    // Insert a committed row using pgPool (NOT ctx.pg.client which is transactional).
    // PostGraphile's row resolver fetches the row in a separate connection and
    // cannot see uncommitted rows from a transactional test client.
    const contactId = randomUUID();
    const pgClient = await ctx.pgPool.connect();
    await pgClient.query(
      'INSERT INTO realtime_codegen_test.contact (id, name) VALUES ($1, $2)',
      [contactId, 'Alice'],
    );
    pgClient.release();

    // Create a graphql-ws client pointing at the test WS server.
    // webSocketImpl is required in Node.js with graphql-ws v6.
    const wsClient = createWsClient({
      url: ctx.ws.serverUrl,
      webSocketImpl: WebSocket,
      retryAttempts: 0,
    });

    // Create the generated ORM client wired to the WS client.
    // RealtimeConfig.client accepts a graphql-ws Client (structurally compatible with WsClient).
    const ormClient = createClient({
      endpoint: ctx.ws.serverUrl.replace('ws://', 'http://'),
      realtime: { client: wsClient },
    });

    const events: Array<{
      operation: string;
      rowId: string | null;
      overflow: boolean;
      data: { rowId: string; name: string } | null;
    }> = [];

    // subscribe() returns an Unsubscribe function
    const unsubscribe = ormClient.contact.subscribe({
      select: { rowId: true, name: true },
      ids: [contactId],
      onEvent: (event: {
        operation: string;
        rowId: string | null;
        overflow: boolean;
        data: { rowId: string; name: string } | null;
      }) => {
        events.push(event);
      },
    });

    // Allow LISTEN to establish before firing NOTIFY
    await new Promise<void>((r) => setTimeout(r, 300));

    await ctx.notifyChange('contact', 'UPDATE', [contactId], 'realtime_codegen_test');

    // Wait for the event with a promise-based timeout pattern
    const received = await new Promise<boolean>((resolve, reject) => {
      const deadline = setTimeout(() => {
        reject(new Error('Timed out waiting for UPDATE event (8s)'));
      }, 8000);
      const poll = setInterval(() => {
        if (events.length > 0) {
          clearTimeout(deadline);
          clearInterval(poll);
          resolve(true);
        }
      }, 50);
    });

    expect(received).toBe(true);
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0].operation).toBe('UPDATE');
    expect(events[0].overflow).toBe(false);
    // Row data is fetched from DB and should match the inserted row
    expect(events[0].data).not.toBeNull();
    expect(events[0].data?.name).toBe('Alice');

    unsubscribe();
    await wsClient.dispose();

    // Clean up the committed row
    const cleanup = await ctx.pgPool.connect();
    await cleanup.query('DELETE FROM realtime_codegen_test.contact WHERE id = $1', [contactId]);
    cleanup.release();
  }, 30000);

  // ─── Test 2: INVALIDATE event (overflow path) ───────────────────────────

  it('receives an INVALIDATE event when overflow is fired', async () => {
    const wsClient = createWsClient({
      url: ctx.ws.serverUrl,
      webSocketImpl: WebSocket,
      retryAttempts: 0,
    });

    const ormClient = createClient({
      endpoint: ctx.ws.serverUrl.replace('ws://', 'http://'),
      realtime: { client: wsClient },
    });

    const events: Array<{ operation: string; overflow: boolean }> = [];

    const unsubscribe = ormClient.contact.subscribe({
      select: { rowId: true },
      onEvent: (event: { operation: string; overflow: boolean }) => {
        events.push(event);
      },
    });

    await new Promise<void>((r) => setTimeout(r, 300));

    // notifyInvalidate fires with overflow=true semantics
    await ctx.notifyInvalidate('contact', 'realtime_codegen_test');

    const received = await new Promise<boolean>((resolve, reject) => {
      const deadline = setTimeout(() => {
        reject(new Error('Timed out waiting for INVALIDATE event (8s)'));
      }, 8000);
      const poll = setInterval(() => {
        if (events.length > 0) {
          clearTimeout(deadline);
          clearInterval(poll);
          resolve(true);
        }
      }, 50);
    });

    expect(received).toBe(true);
    expect(events[0].operation).toBe('INVALIDATE');
    expect(events[0].overflow).toBe(true);

    unsubscribe();
    await wsClient.dispose();
  }, 30000);

  // ─── Test 3: no events delivered after unsubscribe ──────────────────────

  it('does not deliver events after unsubscribe', async () => {
    const wsClient = createWsClient({
      url: ctx.ws.serverUrl,
      webSocketImpl: WebSocket,
      retryAttempts: 0,
    });

    const ormClient = createClient({
      endpoint: ctx.ws.serverUrl.replace('ws://', 'http://'),
      realtime: { client: wsClient },
    });

    const events: Array<{ operation: string }> = [];

    const unsubscribe = ormClient.contact.subscribe({
      select: { rowId: true },
      onEvent: (event: { operation: string }) => {
        events.push(event);
      },
    });

    // Allow LISTEN to establish, then immediately unsubscribe
    await new Promise<void>((r) => setTimeout(r, 200));
    unsubscribe();

    // Fire a notify after unsubscribing — should not reach the handler
    await ctx.notifyChange('contact', 'INSERT', [randomUUID()], 'realtime_codegen_test');

    // Wait long enough that any in-flight event would have arrived
    await new Promise<void>((r) => setTimeout(r, 500));

    expect(events).toHaveLength(0);

    await wsClient.dispose();
  }, 30000);
});
