# Constructive CLI Package - Agent Guide

The `@constructive-io/cli` package provides the user-facing CLI for the Constructive ecosystem.

- **Binaries:** `constructive` (full) and `cnc` (shorthand)
- **What it covers:** Constructive GraphQL workflows only (server, explorer, schema tools, codegen)

**Note:** Database operations (init, add, deploy, revert, etc.) are handled by the separate `pgpm` CLI. Users should install both tools for the complete workflow.

## Entry Points

- **Router:** `packages/cli/src/commands.ts`
  - Builds a command map with GraphQL commands implemented in this package.
- **Executable:** `packages/cli/src/index.ts` (compiled to `dist/index.js`)

## Commands

The CLI provides 4 GraphQL-focused commands:

- `packages/cli/src/commands/server.ts` – start the Constructive GraphQL server
- `packages/cli/src/commands/explorer.ts` – start the Constructive GraphQL explorer
- `packages/cli/src/commands/get-graphql-schema.ts` – emit schema SDL (DB build or endpoint introspection)
- `packages/cli/src/commands/codegen.ts` – run GraphQL codegen (`@constructive-io/graphql-codegen`)

## Debugging Tips

- **Command routing:** `packages/cli/src/commands.ts`
- **Schema generation:** `packages/cli/src/commands/get-graphql-schema.ts` delegates schema building to `@constructive-io/graphql-server`

## Tests

- `packages/cli/__tests__/*` covers the GraphQL commands (codegen, get-graphql-schema, cli)
- Database/PGPM tests are located in `pgpm/cli/__tests__/`
