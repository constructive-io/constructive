# @constructive-io/graphql-dev-server

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
</p>

**Constructive GraphQL Dev Server** is a pure-PostGraphile, single-tenant GraphQL server for local development and test harnesses. It points at one database, exposes the configured schemas, and runs every request as a single fixed Postgres role.

It is deliberately **not** the production server: there is no scoped-routing plane and no tenant `database_id`. Because of that, it only enables the Constructive plugins that do **not** require a `database_id`; plugins that resolve per-tenant config from a `database_id` are excluded.

> For production, use `@constructive-io/graphql-server`, which always resolves each request through the scoped routing plane (`resolve_route()`).

## Quick Start

```ts
import { getEnvOptions } from '@constructive-io/graphql-env';
import { createDevServer } from '@constructive-io/graphql-dev-server';

const server = await createDevServer(
  getEnvOptions({
    pg: { database: 'my_db' },
    api: { exposedSchemas: ['app_public'], roleName: 'administrator' }
  }),
  { port: 5555 }
);

console.log(server.graphqlUrl); // http://127.0.0.1:5555/graphql

// later
await server.stop();
```

## What it does

- Builds a Constructive-style PostGraphile v5 preset via `createConstructivePreset()`, so all the standard presets (connection filters, search, PostGIS, ltree, direct uploads, meta-schema, inflection, type mappings, etc.) are baked in automatically.
- Serves the schemas in `api.exposedSchemas` from a single database.
- Runs every request as one fixed role (`api.roleName` → `api.anonRole` → `pg.user`). There is no per-request auth and no routing.
- Exposes `/healthz`, `/graphql`, and `/graphiql`.

## Plugins that are excluded

The following plugin groups resolve per-tenant configuration from a `database_id` and are therefore **disabled** in the dev server:

- **Presigned uploads / bucket provisioner** (`enablePresignedUploads: false`) — resolve per-tenant storage config keyed by `database_id`.
- **LLM** (`enableLlm: false`) — resolves per-tenant billing / inference-log config keyed by `database_id`.

Direct uploads stay enabled: they stream to a fixed, env-configured bucket and need no `database_id`.

## Configuration

Configuration is merged from defaults, config files, and env vars via `@constructive-io/graphql-env`. See `graphql/env/README.md` for the full list.

| Option                | Source env var        | Purpose                                    |
| --------------------- | --------------------- | ------------------------------------------ |
| `pg.database`         | `PGDATABASE`          | Database to serve                          |
| `api.exposedSchemas`  | `API_EXPOSED_SCHEMAS` | Schemas to expose                          |
| `api.roleName`        | `API_ROLE_NAME`       | Fixed Postgres role for every request      |
| `api.anonRole`        | `API_ANON_ROLE`       | Fallback role if `roleName` is unset       |

## API

- `createDevServer(opts?, serverOpts?)` → `Promise<DevServerInfo>` — starts an Express + PostGraphile server. `DevServerInfo` includes `url`, `graphqlUrl`, `port`, `host`, `httpServer`, `app`, and `stop()`.
- `buildDevPreset({ pool, schemas, role })` → `GraphileConfig.Preset` — the dev preset, if you want to embed it in your own server.

## Related Packages

- `@constructive-io/graphql-server` — production scoped-routing server
- `@constructive-io/graphql-env` — env parsing + defaults
- `graphile-settings` — PostGraphile configuration presets
