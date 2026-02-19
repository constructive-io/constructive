# Constructive CLI Package - Agent Guide

The `@constructive-io/cli` package provides the user-facing CLI for the Constructive ecosystem.

- **Binaries:** `constructive` (full) and `cnc` (shorthand)
- **What it covers:** Constructive GraphQL workflows only (server, explorer, codegen)

**Note:** Database operations (init, add, deploy, revert, etc.) are handled by the separate `pgpm` CLI. Users should install both tools for the complete workflow.

## Entry Points

- **Router:** `packages/cli/src/commands.ts`
  - Builds a command map with GraphQL commands implemented in this package.
- **Executable:** `packages/cli/src/index.ts` (compiled to `dist/index.js`)

## Commands

The CLI provides GraphQL-focused commands:

- `packages/cli/src/commands/server.ts` – start the Constructive GraphQL server
- `packages/cli/src/commands/explorer.ts` – start the Constructive GraphQL explorer
- `packages/cli/src/commands/codegen.ts` – run GraphQL codegen (`@constructive-io/graphql-codegen`), including `--schema-only` for SDL export

## Debugging Tips

- **Command routing:** `packages/cli/src/commands.ts`
- **Codegen handler:** `packages/cli/src/commands/codegen.ts` delegates to `runCodegenHandler()` from `@constructive-io/graphql-codegen`
- **Schema building:** `graphile-schema` package provides `buildSchemaSDL` (from database) and `fetchEndpointSchemaSDL` (from endpoint)

## Tests

- `packages/cli/__tests__/*` covers the GraphQL commands (codegen, cli)
- Database/PGPM tests are located in `pgpm/cli/__tests__/`
