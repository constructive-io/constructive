// Proof of concept: the UNMODIFIED pgpm migrate engine deploying into PGlite.
//
// PGlite is ElectricSQL's WASM build of Postgres ("SQLite for Postgres") — it runs
// in-process with no server and no Postgres service container. pgpm's engine only
// needs a node-`pg`-shaped client (`query` / `connect`), so we expose the PGlite
// instance over a socket with the official pg-gateway shim and point pgpm at it.
//
// This script starts the PGlite socket server in-process, then runs a real pgpm
// deploy -> verify -> revert against it, asserting the outcome. It exits non-zero
// on any mismatch so CI fails loudly.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite-pgvector';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import pg from 'pg';

const require = createRequire(import.meta.url);
// The published pgpm migrate engine — not modified, not vendored.
const { PgpmMigrate } = require('@pgpmjs/core');

const HOST = '127.0.0.1';
const PORT = Number(process.env.PGLITE_PORT || 5555);
const MODULE = new URL('./module', import.meta.url).pathname;
const pgConfig = { host: HOST, port: PORT, user: 'postgres', password: 'x', database: 'postgres' };

function step(msg) { console.log(`\n=== ${msg} ===`); }

// --- boot PGlite + socket shim -------------------------------------------------
const db = await PGlite.create({ extensions: { vector } });
await db.waitReady;
// Extensions are provisioned OUT-OF-BAND: pgpm's cleanSql strips CREATE EXTENSION
// from migrations, exactly like pgsql-test's admin.installExtensions() / the
// postgres-plus image. PGlite additionally requires the ext registered in JS above.
await db.exec('CREATE EXTENSION IF NOT EXISTS vector;');

// PGlite serializes all queries onto one engine; the socket shim caps concurrent
// connections at 1 by default. Raise it so a pooled client works (still serialized).
const server = new PGLiteSocketServer({ db, host: HOST, port: PORT, maxConnections: 10 });
await server.start();
console.log(`[pglite] Postgres (WASM) listening on ${HOST}:${PORT}`);

let ok = false;
try {
  const migrate = new PgpmMigrate(pgConfig);

  step('initialize (bootstrap pgpm_migrate schema in PGlite)');
  await migrate.initialize();

  step('deploy plan: schema -> table -> index -> pgvector column');
  // useTransaction:false because PGlite pins the engine to one connection while a
  // transaction is open; the engine's deploy path mixes a txn client with pool
  // queries, which deadlocks a single-connection backend. (See README.)
  const deployed = await migrate.deploy({ modulePath: MODULE, useTransaction: false });
  console.log('deployed:', deployed.deployed);
  assert.deepEqual(deployed.deployed, ['schema', 'table', 'index', 'embedding']);
  assert.equal(deployed.failed, undefined);

  step('verify');
  const verified = await migrate.verify({ modulePath: MODULE });
  console.log('verify:', verified);
  assert.deepEqual(verified.verified, ['schema', 'table', 'index', 'embedding']);
  assert.deepEqual(verified.failed, []);

  step('data round-trip through the pgpm-deployed schema (pgvector)');
  const client = new pg.Client(pgConfig);
  await client.connect();
  await client.query(
    'INSERT INTO test_app.users(name, email, embedding) VALUES ($1, $2, $3)',
    ['ada', 'ada@example.com', '[0.1,0.2,0.3]']
  );
  const nearest = (await client.query(
    'SELECT name FROM test_app.users ORDER BY embedding <-> $1 LIMIT 1',
    ['[0.1,0.2,0.3]']
  )).rows;
  console.log('nearest-neighbor:', nearest);
  assert.deepEqual(nearest, [{ name: 'ada' }]);

  const changesAfterDeploy = (await client.query(
    'SELECT change_name FROM pgpm_migrate.changes ORDER BY 1'
  )).rows.map((r) => r.change_name);
  assert.deepEqual(changesAfterDeploy, ['embedding', 'index', 'schema', 'table']);

  step('revert (full)');
  const reverted = await migrate.revert({ modulePath: MODULE, useTransaction: false });
  console.log('reverted:', reverted.reverted ?? reverted);
  const changesAfterRevert = (await client.query(
    'SELECT change_name FROM pgpm_migrate.changes ORDER BY 1'
  )).rows.map((r) => r.change_name);
  assert.deepEqual(changesAfterRevert, []);
  assert.equal((await client.query("SELECT to_regclass('test_app.users') AS t")).rows[0].t, null);
  await client.end();

  ok = true;
  console.log('\nPASS: unmodified pgpm engine deployed + verified + reverted real migrations in PGlite; pgvector operational.');
} catch (err) {
  console.error('\nFAIL:', err);
} finally {
  await server.stop();
  await db.close();
}

process.exit(ok ? 0 : 1);
