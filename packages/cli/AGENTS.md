# Constructive CLI Package - Agent Guide

The `@constructive-io/cli` package provides the user-facing CLI for the Constructive ecosystem.

- **Binaries:** `constructive` (full) and `cnc` (shorthand)
- **What it covers:** contexts/authentication, raw GraphQL execution, codegen,
  and GraphQL/jobs service lifecycles

**Note:** Database operations (init, add, deploy, revert, etc.) are handled by the separate `pgpm` CLI. Users should install both tools for the complete workflow.

## Entry Points

- **Router:** `packages/cli/src/commands.ts`
  - Owns global argument parsing, terminal mode resolution, prompt collection,
    structured output isolation, and process exit-code mapping.
- **Executable:** `packages/cli/src/index.ts` (compiled to `dist/index.js`)
- **Registry:** `packages/cli/src/runtime/registry.ts`
- **Reusable runtime:** `packages/cli-runtime`

## Commands

The registry-backed command operations are:

- `runtime/state-commands.ts` – context and authentication operations
- `runtime/execute-command.ts` – guarded raw GraphQL execution
- `runtime/codegen-command.ts` – ownership-aware codegen planning/application
- `runtime/service-commands.ts` – server, explorer, and jobs lifecycles
- `runtime/discovery-commands.ts` – help, schemas, docs, and completions

Files under `src/commands/` are retained legacy terminal handlers; new command
behavior must be implemented as a `CommandDefinition` and registered in
`runtime/registry.ts`.

## Debugging Tips

- **Command routing:** `packages/cli/src/commands.ts`
- **Command contracts:** `cnc commands --format json` and
  `cnc schema <command...> --format json`
- **Codegen operation:** `runCodegenOperation()` from
  `@constructive-io/graphql-codegen`; terminal rendering stays outside it
- **Schema building:** `graphile-schema` package provides `buildSchemaSDL` (from database) and `fetchEndpointSchemaSDL` (from endpoint)

## Tests

- `packages/cli/__tests__/*` covers protocol behavior, state safety, raw
  GraphQL, codegen, services, and the compatibility gate
- `packages/cli-runtime/__tests__/*` covers registry, binding, validation,
  redaction, discovery projections, and protocol envelopes
- Database/PGPM tests are located in `pgpm/cli/__tests__/`
