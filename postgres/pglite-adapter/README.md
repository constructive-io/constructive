# @pgpmjs/pglite-adapter

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
  <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE">
    <img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/>
  </a>
  <a href="https://www.npmjs.com/package/@pgpmjs/pglite-adapter">
    <img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=postgres%2Fpglite-adapter%2Fpackage.json"/>
  </a>
</p>

A PGlite driver for pgpm. It registers an **in-process** [PGlite](https://github.com/electric-sql/pglite)
instance (WASM Postgres) as the `pg-cache` pool factory, so the **unmodified**
pgpm engine deploys, verifies, and reverts migrations against PGlite with **no
Postgres server and no socket**.

All `@electric-sql/pglite*` dependencies live here — `@pgpmjs/core`, `pg-cache`,
and `pgsql-test` never import them.

## Install

```sh
npm install @pgpmjs/pglite-adapter @electric-sql/pglite
```

`@electric-sql/pglite` is a peer dependency, so you pin the version.

## How it works

pgpm's engine only needs a node-`pg`-shaped pool (`query` / `connect` / `end`).
Step 1 added a driver seam in `pg-cache` (`registerPgPoolFactory`). This package
implements that seam against PGlite's JS API:

- parameterized queries → `db.query` (extended protocol)
- parameterless / multi-statement SQL (pgpm's bootstrap) → `db.exec`

Because PGlite is a single in-process session, both `pool.query` and the client
returned by `connect()` share one session — so pgpm's transactional deploy works
without the socket PoC's `useTransaction: false` workaround.

## Usage

```ts
import { PgpmMigrate } from '@pgpmjs/core';
import { registerPglite } from '@pgpmjs/pglite-adapter';

const { db, close } = await registerPglite();

const migrate = new PgpmMigrate({ database: 'postgres' /* ...pg config */ });
await migrate.deploy({ modulePath: './my-module' });
await migrate.verify({ modulePath: './my-module' });

await close(); // restores the previous factory and closes PGlite
```

### Extensions

pgpm's `cleanSql` strips `CREATE EXTENSION` from migrations, so extensions are
provisioned out-of-band — register the WASM extension at construction and run
`CREATE EXTENSION` at bootstrap:

```ts
import { vector } from '@electric-sql/pglite-pgvector';

const { db, close } = await registerPglite({
  extensions: { vector },
  extensionSql: ['CREATE EXTENSION IF NOT EXISTS vector;']
});
```
