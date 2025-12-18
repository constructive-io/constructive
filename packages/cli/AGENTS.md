# Constructive CLI Package - Agent Guide

The `@constructive-io/cli` package provides the user-facing CLI for the Constructive ecosystem.

- **Binaries:** `constructive` (full) and `cnc` (shorthand)
- **What it covers:** PGPM database workflows (via the `pgpm` package) plus Constructive GraphQL workflows (server, explorer, schema tools, codegen)

## Entry Points

- **Router:** `packages/cli/src/commands.ts`
  - Builds a command map by merging `createPgpmCommandMap()` (from the `pgpm` package) with Constructive GraphQL commands implemented in this package.
- **Executable:** `packages/cli/src/index.ts` (compiled to `dist/index.js`)

## Command Sources

### PGPM Commands (delegated)

Most database/workspace commands are delegated to the `pgpm` package via `createPgpmCommandMap()`:

- `init`, `add`, `deploy`, `revert`, `verify`, `plan`, `package`, `export`, `migrate`, `install`, `extension`, `tag`, `admin-users`, etc.

Implementation lives under:

- `pgpm/pgpm/src/commands/*` (CLI behavior)
- `pgpm/core/src/*` (core engine)

### Constructive GraphQL Commands (local)

These are implemented directly in this package:

- `packages/cli/src/commands/server.ts` – start the Constructive GraphQL server
- `packages/cli/src/commands/explorer.ts` – start the Constructive GraphQL explorer
- `packages/cli/src/commands/get-graphql-schema.ts` – emit schema SDL (DB build or endpoint introspection)
- `packages/cli/src/commands/codegen.ts` – run GraphQL codegen (`@constructive-io/graphql-codegen`)

## Debugging Tips

- **Command routing:** `packages/cli/src/commands.ts`
- **Schema generation:** `packages/cli/src/commands/get-graphql-schema.ts` delegates schema building to `@constructive-io/graphql-server`
- **PG connections cleanup:** PGPM commands are wrapped to teardown `pg-cache` pools after execution (see `pgpm/pgpm/src/commands.ts`)

## Tests

- `packages/cli/__tests__/*` covers both delegated PGPM commands (through the Constructive CLI router) and the local GraphQL commands.
