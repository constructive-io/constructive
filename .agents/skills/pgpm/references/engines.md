# Engines (migration backends)

pgpm deploys through a **named engine**, in the sqitch `core.engine` sense: a short
name selects the backend that runs migrations. The default is `pg` — a real
PostgreSQL server over TCP, exactly as pgpm has always behaved.

| Engine | Backend | Notes |
|--------|---------|-------|
| `pg` (default) | PostgreSQL server | Full capabilities: `createdb`, `pg_dump`, Docker lifecycle, multiple connections |
| `pglite` | In-process PGlite (WASM Postgres) | No server, no socket; the instance *is* the database |

## Selecting an engine

Every database command accepts the selectors, and the first match wins:

```bash
pgpm deploy --driver @acme/my-adapter   # 1. name a driver plugin package directly
pgpm deploy --pglite                    # 2. sugar for --engine pglite (in-memory)
pgpm deploy --pglite=./.pglite          #    ...persisted to ./.pglite
pgpm deploy --engine pglite             # 3. by engine name
```

Otherwise the engine comes from configuration, then from the `pg` default:

```json
{
  "packages": ["packages/*"],
  "engine": "pglite",
  "engines": {
    "pglite": { "options": { "dataDir": "./.pglite" } }
  }
}
```

`PGPM_ENGINE=pglite` sets the same thing from the environment. The `engines` block
is the analogue of sqitch's `[engine "name"]` sections: an entry is merged over
its built-in, so declaring only `options` keeps the built-in plugin, and a new
name registers a new engine:

```json
{ "engines": { "turso": { "plugin": "@acme/turso-adapter", "options": { "url": "libsql://..." } } } }
```

## Capabilities and server-only commands

A driver plugin declares what its backend can do, and pgpm gates on that rather
than special-casing backends:

| Capability | Gates |
|------------|-------|
| `createdb` | `deploy --createdb` (skipped with a notice when unavailable) |
| `dump` | `pgpm dump` |
| `serverLifecycle` | `pgpm docker`, `pgpm kill`, `pgpm tune` |
| `multiConnection` | `pgpm admin-users` |

On `pglite` all four are false, so `pgpm dump` exits with
`pgpm dump is not supported by the "pglite" engine — it has no pg_dump.`

## Deploying into PGlite with no server

```bash
pnpm add -D @pgpmjs/pglite-adapter @electric-sql/pglite
pgpm deploy --engine pglite --database anything --package pets --yes
```

The plugin is resolved from the *consumer* project's `node_modules`, so it must be
installed in the workspace being deployed (pgpm itself never depends on PGlite).
`--database` is still accepted but names nothing on this engine.

Tests keep using `pglite-test`'s `getConnections()`, which registers the same
in-process instance directly; the engine flag is the CLI equivalent of that.

## Writing a driver plugin

A plugin is any package exporting `createPgpmDriver`:

```ts
import type { PgpmDriverSession } from '@pgpmjs/types';

export const createPgpmDriver = async (
  options: Record<string, unknown> = {}
): Promise<PgpmDriverSession> => {
  const handle = await register(options);       // register pool/client factories
  return {
    capabilities: { createdb: false, dump: false, serverLifecycle: false, multiConnection: false },
    teardown: () => handle.close()
  };
};
```

pgpm activates it before the command runs and tears it down afterwards, so the
unmodified migration engine targets whatever the factories return. See
`@pgpmjs/pglite-adapter` for a complete implementation.
