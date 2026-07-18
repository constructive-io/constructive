---
name: ephemeral-pgpm-fixtures
description: "Ephemeral pgpm fixtures workspace — install real published @pgpm/* modules into a gitignored extensions/ directory and deploy them into test databases with seed.pgpm, instead of hand-maintaining copies of production DDL. Use when running or writing integration tests that need metaschema/services/module schemas, when tests fail with 'no pgpm module found', or when bumping fixture module versions."
compatibility: pgpm, pgsql-test, graphile-test, graphql-server-test, Jest, PostgreSQL
metadata:
  author: constructive-io
  version: "1.0.0"
---

# Ephemeral pgpm Fixtures

Integration tests that need production-shaped Constructive schemas (metaschema,
services, module registration tables) deploy the **real published `@pgpm/*`
modules** rather than hand-written SQL approximations. The modules live in a
gitignored ephemeral workspace at `__fixtures__/pgpm/workspace/extensions/`,
pinned by version in `__fixtures__/pgpm/workspace/pgpm.json`.

## When to Apply

- Running integration tests in `graphql/server-test`, `graphile/graphile-function-bindings`, or anything that seeds with `seed.pgpm(...)`
- A test fails with `seed.pgpm: no pgpm module found at ...`
- Bumping the fixture modules to a newer published version
- Adding a new test that needs metaschema/services/module DDL

## Setup (local + CI)

```bash
pnpm install
pnpm build                    # builds the pgpm CLI used by fixtures:install
pnpm fixtures:install         # installs pinned @pgpm/* modules into the gitignored extensions/
```

`fixtures:install` is idempotent — it skips modules already present. Use
`pnpm fixtures:install:force` to reinstall everything.

## Using the modules in tests

```typescript
import { getConnections, seed } from 'pgsql-test'; // or graphile-test / server-test

const pgpmWorkspace = path.resolve(__dirname, '../../../__fixtures__/pgpm/workspace');

await getConnections(options, [
  seed.pgpm(pgpmWorkspace),           // deploys ALL installed modules in dependency order
  seed.sqlfile([
    shared('services', 'grants.sql'), // widens grants to test roles
    /* app schemas, test data ... */
  ])
]);
```

Key facts:
- `seed.pgpm(dir)` deploys a pgpm module (and its dependencies) into the isolated test database; pass a workspace root to deploy every installed module once, in dependency order. Don't chain multiple `seed.pgpm(module)` calls that share dependencies — fast deploys are not idempotent across calls.
- The real modules only grant to production roles — include `__fixtures__/seed/services/grants.sql` so `administrator`/`authenticated`/`anonymous` test roles can read/write.
- Per-app *generated* tables (compute `function_definitions`, storage tables) are NOT published modules — they stay as hand-written fixtures (`__fixtures__/seed/compute/setup.sql`, `simple-seed-storage/`).
- The deterministic pgpm engine fixtures under `__fixtures__/sqitch/` are intentionally frozen — never replace them with installed modules.

## Upgrading module versions

```bash
node pgpm/cli/dist/index.js install @pgpm/metaschema-modules@latest --cwd __fixtures__/pgpm/workspace
```

This installs the latest published version and records it in
`__fixtures__/pgpm/workspace/pgpm.json` — commit the 1-line version bump.

## Workspace-level `pgpm install`

`pgpm install` works at a workspace root (no module/.control file needed):
- with no args, it installs everything pinned in the workspace `pgpm.json` `dependencies`
- with explicit packages, it installs them and records resolved versions back into `pgpm.json`
- `--force` reinstalls even if the extension directories already exist
