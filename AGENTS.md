# Constructive Agent Navigation Guide

This guide helps AI agents quickly navigate the Constructive monorepo. Constructive provides tooling for building secure, role-aware GraphQL APIs backed by PostgreSQL.

## Quick Start

**Most important packages to know first:**
1. **`pgpm/core`** – PGPM engine: migrations, packaging, dependency resolution ([guide](pgpm/core/AGENTS.md))
2. **`pgpm/pgpm`** – PGPM CLI: database/workspace commands (init/add/deploy/verify/etc)
3. **`packages/cli`** – Constructive CLI (`constructive` / `cnc`), delegates PGPM commands and adds GraphQL workflows ([guide](packages/cli/AGENTS.md))
4. **`postgres/pgsql-test`** – PostgreSQL test harness and seed adapters ([guide](postgres/pgsql-test/AGENTS.md))
5. **`graphql/server`** – Constructive GraphQL server (Express + PostGraphile)
6. **`graphql/codegen`** – GraphQL code generation (types/ops/sdk)

**Key classes and entry points:**
- **`PgpmPackage`** – `pgpm/core/src/core/class/pgpm.ts`
- **`PgpmMigrate`** – `pgpm/core/src/migrate/client.ts`
- **`GraphQLServer`** – `graphql/server/src/server.ts`

## Monorepo Layout

- **`packages/*`** – Constructive CLI + misc packages (`client`, `orm`, `query-builder`, `url-domains`, `server-utils`, etc.)
- **`pgpm/*`** – PGPM engine + CLI + shared types/logger/env
- **`graphql/*`** – GraphQL server, explorer, codegen, types/env, query/react utilities
- **`postgres/*`** – PostgreSQL tooling and tests (`pg-ast`, `pg-codegen`, `introspectron`, `pgsql-test`, etc.)
- **`streaming/*`** – S3 helpers and stream hashing utilities
- **`extensions/*`** – PGPM extension modules (Postgres extensions packaged as PGPM modules)
- **`graphile/*`** – Graphile/PostGraphile plugins (kept under their own namespace)
- **`jobs/*`**, **`functions/*`**, **`sandbox/*`** – supporting systems and examples

## Entry Points

### PGPM CLI (`pgpm`)

- **Router:** `pgpm/pgpm/src/commands.ts`
- **Executable:** `pgpm/pgpm/src/index.ts`
- **Command implementations:** `pgpm/pgpm/src/commands/*`

### Constructive CLI (`constructive` / `cnc`)

- **Router:** `packages/cli/src/commands.ts`
- **Local GraphQL commands:** `packages/cli/src/commands/*`
- **Delegated PGPM commands:** sourced from `pgpm/pgpm`

### GraphQL Server

- **Entry:** `graphql/server/src/index.ts`
- **Server implementation:** `graphql/server/src/server.ts`
- **Schema wiring:** `graphql/server/src/schema.ts`

## Common Workflows (via CLI)

**Database Operations (pgpm):**
- Initialize workspace/module: `pgpm init workspace`, `pgpm init`
- Create a change: `pgpm add <change>`
- Deploy/verify/revert: `pgpm deploy`, `pgpm verify`, `pgpm revert`
- Install PGPM modules: `pgpm install <pkg@version>`

**GraphQL Operations (cnc/constructive):**
- Start GraphQL server: `cnc server`
- Launch GraphiQL explorer: `cnc explorer`
- Generate types/SDK: `cnc codegen`
- Export schema SDL: `cnc get-graphql-schema`

## Tips

1. Start with `pgpm/core/AGENTS.md` to understand the migration and plan model.
2. Use `packages/cli/AGENTS.md` to understand Constructive’s command routing.
3. Use `postgres/pgsql-test/AGENTS.md` for patterns around isolated test DBs and seeding.
