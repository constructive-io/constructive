// End-to-end example: the UNMODIFIED pgpm migrate engine deploying into PGlite
// over the pg-gateway socket shim.
//
// PGlite is ElectricSQL's WASM build of Postgres ("SQLite for Postgres") — it runs
// in-process with no server and no Postgres service container. pgpm's engine only
// needs a node-`pg`-shaped client (`query` / `connect`), so we expose the PGlite
// instance over a socket with the official pg-gateway shim and point pgpm at it.
//
// This proves the wire-protocol path. The in-process driver path (no socket) is
// covered by @pgpmjs/pglite-adapter + pglite-test.
import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite-pgvector';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { PgpmMigrate } from '@pgpmjs/core';
import { join } from 'path';
import pg from 'pg';
import { teardownPgPools } from 'pg-cache';

const HOST = '127.0.0.1';
const PORT = Number(process.env.PGLITE_PORT || 5544);
const MODULE = join(__dirname, '..', '__fixtures__');
const pgConfig = { host: HOST, port: PORT, user: 'postgres', password: 'x', database: 'postgres' };

describe('pglite-socket: unmodified pgpm engine deploys into PGlite over the socket shim', () => {
  let db: PGlite;
  let server: PGLiteSocketServer;
  let client: pg.Client;

  beforeAll(async () => {
    db = await PGlite.create({ extensions: { vector } });
    await db.waitReady;
    // Extensions are provisioned OUT-OF-BAND: pgpm's cleanSql strips CREATE EXTENSION
    // from migrations, exactly like pgsql-test's admin.installExtensions() / the
    // postgres-plus image. PGlite additionally requires the ext registered in JS above.
    await db.exec('CREATE EXTENSION IF NOT EXISTS vector;');

    // PGlite serializes all queries onto one engine; the socket shim caps concurrent
    // connections at 1 by default. Raise it so a pooled client works (still serialized).
    server = new PGLiteSocketServer({ db, host: HOST, port: PORT, maxConnections: 10 });
    await server.start();

    client = new pg.Client(pgConfig);
    await client.connect();
  });

  afterAll(async () => {
    // PgpmMigrate opens a pool through pg-cache; close it before the socket dies.
    await teardownPgPools();
    await client?.end();
    await server?.stop();
    await db?.close();
  });

  it('bootstraps the pgpm_migrate schema in PGlite', async () => {
    const migrate = new PgpmMigrate(pgConfig);
    await migrate.initialize();
    const res = await client.query<{ schema_name: string }>(
      "SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'pgpm_migrate'"
    );
    expect(res.rows).toHaveLength(1);
  });

  it('deploys the plan change-by-change', async () => {
    const migrate = new PgpmMigrate(pgConfig);
    // useTransaction:false because over the socket PGlite pins the engine to one
    // connection while a transaction is open; the engine's deploy path mixes a txn
    // client with pool queries, which deadlocks a single-connection backend. The
    // in-process @pgpmjs/pglite-adapter avoids this (both seams share one session).
    const deployed = await migrate.deploy({ modulePath: MODULE, useTransaction: false });
    expect(deployed.deployed).toEqual(['schema', 'table', 'index', 'embedding']);
    expect(deployed.failed).toBeUndefined();
  });

  it('verifies every deployed change', async () => {
    const migrate = new PgpmMigrate(pgConfig);
    const verified = await migrate.verify({ modulePath: MODULE });
    expect(verified.verified).toEqual(['schema', 'table', 'index', 'embedding']);
    expect(verified.failed).toEqual([]);
  });

  it('runs a pgvector nearest-neighbor query through the pgpm-deployed schema', async () => {
    await client.query(
      'INSERT INTO test_app.users(name, email, embedding) VALUES ($1, $2, $3)',
      ['ada', 'ada@example.com', '[0.1,0.2,0.3]']
    );
    const nearest = (
      await client.query<{ name: string }>(
        'SELECT name FROM test_app.users ORDER BY embedding <-> $1 LIMIT 1',
        ['[0.1,0.2,0.3]']
      )
    ).rows;
    expect(nearest).toEqual([{ name: 'ada' }]);
  });

  it('records deployed changes in the pgpm registry', async () => {
    const changes = (
      await client.query<{ change_name: string }>(
        'SELECT change_name FROM pgpm_migrate.changes ORDER BY 1'
      )
    ).rows.map((r) => r.change_name);
    expect(changes).toEqual(['embedding', 'index', 'schema', 'table']);
  });

  it('reverts the full plan and empties the registry', async () => {
    const migrate = new PgpmMigrate(pgConfig);
    await migrate.revert({ modulePath: MODULE, useTransaction: false });
    const changes = (
      await client.query<{ change_name: string }>(
        'SELECT change_name FROM pgpm_migrate.changes ORDER BY 1'
      )
    ).rows.map((r) => r.change_name);
    expect(changes).toEqual([]);
    const gone = await client.query<{ t: string | null }>(
      "SELECT to_regclass('test_app.users') AS t"
    );
    expect(gone.rows[0].t).toBeNull();
  });
});
