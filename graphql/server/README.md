# @constructive-io/graphql-server

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/@constructive-io/graphql-server"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=graphql%2Fserver%2Fpackage.json"/></a>
</p>

**Constructive GraphQL Server** is an Express-based server built on PostGraphile. It reads Constructive metadata to select API schemas, applies RLS-aware auth, and exposes a production-ready GraphQL API.

## 🚀 Quick Start

### Use as SDK

Install the package:

```bash
pnpm add @constructive-io/graphql-server @constructive-io/graphql-env
```

Start a server:

```ts
import { getEnvOptions } from '@constructive-io/graphql-env';
import { GraphQLServer } from '@constructive-io/graphql-server';

GraphQLServer(
  getEnvOptions({
    pg: { database: 'constructive_db' },
    server: { host: '0.0.0.0', port: 3000 }
  })
);
```

> **Tip:** Set `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` to control DB connectivity.
See [Configuration](#configuration) for the full list of supported env vars and defaults.

### Local Development (this repo)

```bash
pnpm install
cd graphql/server
pnpm dev
```

This starts the server with env defaults from `@constructive-io/graphql-env`.
> **Tip:** Set `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` to control DB connectivity.
See [Configuration](#configuration) for the full list of supported env vars and defaults.


## What it does

With `api.enableMetaApi` enabled (default), the server resolves API settings from the meta schema, configures PostGraphile with the right schemata and roles, and serves GraphQL over `/graphql`.

## Key Features

- Automatic GraphQL API generation from PostgreSQL schemas
- RLS-aware authentication and per-request `pgSettings`
- Meta-schema routing by domain + subdomain
- File uploads via `graphql-upload`
- GraphiQL and health check endpoints
- Schema cache flush via `/flush` or database notifications

## Routes

- `GET /healthz` -> health check
- `GET /graphiql` -> GraphiQL UI
- `GET /graphql` / `POST /graphql` -> GraphQL endpoint
- `POST /graphql` (multipart) -> file uploads
- `POST /flush` -> clears cached Graphile schema for the current API

## Meta API routing

When `API_ENABLE_META=true` (default):

- The server resolves APIs from `meta_public.domains` using the request host.
- Only APIs where `api.is_public` matches `API_IS_PUBLIC` are served.
- In private mode (`API_IS_PUBLIC=false`), you can override with headers:
  - `X-Api-Name` + `X-Database-Id`
  - `X-Schemata` + `X-Database-Id`
  - `X-Meta-Schema` + `X-Database-Id`

## Configuration

Configuration is merged from defaults, config files, and env vars via `@constructive-io/graphql-env`. See `graphql/env/README.md` for the full list.

Common env vars:

- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`
- `API_ENABLE_META`, `API_IS_PUBLIC`, `API_META_SCHEMAS`, `API_EXPOSED_SCHEMAS`
- `API_ANON_ROLE`, `API_ROLE_NAME`, `API_DEFAULT_DATABASE_ID`

## Testing

Use `supertest` or your HTTP client of choice against `/graphql`. For RLS-aware tests, provide a `Bearer` token and ensure the API's auth function is available.

## Related Packages

- `@constructive-io/graphql-env` - env parsing + defaults for GraphQL
- `@constructive-io/graphql-types` - shared types and defaults
- `graphile-settings` - PostGraphile configuration
- `graphile-meta-schema` - meta schema support
