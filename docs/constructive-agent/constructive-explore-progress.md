# Constructive Explore Progress Log

## 2026-02-24 - Phase 1 (Codegen Catalog Contract)
- Added ORM tool dispatch/policy metadata to `getOrmMcpTools`.
- Added `generateOrmAgentCatalog()` to emit `orm/agent-catalog.json`.
- Wired `generate.ts` to always emit ORM catalog when ORM output is generated.
- Added unit coverage in `graphql/codegen/src/__tests__/codegen/cli-generator.test.ts` for catalog shape.

## 2026-02-24 - Phase 2 (PI Extension Runtime Wiring)
- Added catalog/cache model utilities in `packages/constructive-agent-pi-extension/src/orm-catalog.ts`.
- Added on-demand codegen exploration flow in `packages/constructive-agent-pi-extension/src/explore-service.ts`.
- Added generated ORM dispatcher execution path in `packages/constructive-agent-pi-extension/src/orm-dispatcher.ts`.
- Refactored extension factory to register:
  - `constructive_orm_call` dispatcher tool
  - `/constructive-explore` command
  - `/constructive-capabilities` command
- Preserved legacy operation tools behind compatibility switches (`legacyDocumentTools` or `ormDispatcher.strict=false`).

## Next Verification Tasks
- Run unit/integration tests for `graphql/codegen` and `constructive-agent-pi-extension`.
- Update failing tests for strict ORM default behavior.
- Validate command/tool behavior with the PI SDK integration test harness.

## 2026-02-24 - Verification Pass
- Ran `pnpm -C graphql/codegen exec jest -u src/__tests__/codegen/cli-generator.test.ts`.
  - Result: pass (55 tests), 1 snapshot updated.
- Ran `pnpm -C packages/constructive-agent-pi-extension test`.
  - Result: pass (12 tests across unit + integration).
- Added explicit unit test for new default mode:
  - dispatcher tool (`constructive_orm_call`) registered by default
  - explore/capabilities commands registered by default
  - legacy operation tools disabled unless compatibility mode enabled

## Remaining Risks / Follow-ups
- `ensureOrmCatalog()` loads `@constructive-io/graphql-codegen` dynamically; packaging/publish pipeline should validate runtime availability in non-monorepo installs.
- Generated ORM module loading relies on dynamic import / optional `jiti` path. Add dedicated runtime integration test for `/constructive-explore` + `constructive_orm_call` end-to-end in CLI wrapper environment.

## 2026-02-25 - Runtime Loader Fix (ESM/CJS)
- Investigated `/constructive-explore` runtime error when loading graphql-codegen.
- Root issue: fallback targeted `graphql/codegen/src/index.ts`, causing ESM warning and failing import in PI runtime context.
- Updated explore loader to:
  - prefer `jiti` if available
  - use dist-first candidates (`graphql/codegen/dist/index.js`)
  - handle both `mod.generate` and `mod.default.generate` interop
  - include last import error context in thrown message

## 2026-02-25 - Artifact Mismatch Fix
- Reproduced runtime failure where `/constructive-explore` expected `orm/agent-catalog.json` but generated output did not include it.
- Root cause: `graphql/codegen/dist` was stale and lacked `generateOrmAgentCatalog` wiring.
- Fix applied:
  - rebuilt `graphql/codegen` dist
  - rebuilt `constructive-agent-pi-extension` dist
  - verified dist now references `generateOrmAgentCatalog`
  - verified generated output includes `orm/agent-catalog.json` in a standalone dry check

## 2026-02-25 - Generated ORM Runtime Dependency Fix
- Reproduced `Cannot find module '@0no-co/graphql.web'` while executing generated ORM runtime from `.constructive/agent/catalogs/.../generated`.
- Implemented runtime fix in dispatcher:
  - before loading generated `orm/index.ts`, ensure `generated/node_modules` symlink points to extension runtime node_modules
  - verify required runtime packages exist (`@0no-co/graphql.web`, `gql-ast`, `graphql`)
- Added explicit runtime dependencies to `packages/constructive-agent-pi-extension/package.json` to guarantee availability.

## 2026-02-24 - Dispatcher Stability + UX Hardening
- Fixed ORM dispatcher execution context bugs:
  - bind generated model/custom methods to their accessor object (`this` preserved), resolving runtime `this.client` failures.
  - normalize pagination aliases (`take`/`limit` -> `first`, `skip` -> `offset`) before validation/execution.
- Relaxed local create validation for agent workflows:
  - runtime validator defaults to `permissive` mode for `modelCreateFlat`.
  - codegen ORM create-tool schemas no longer emit top-level `required` lists.
- Improved unknown-tool handling for `constructive_orm_call`:
  - discovery-style tool guesses now return actionable guidance to use `/constructive-capabilities --json`.
  - suggestion ranking now returns nearest available catalog tools.
- Added regression coverage:
  - `orm-dispatcher.test.ts` for alias normalization, permissive validation, and bound method execution.
  - `extension-factory.test.ts` for unknown-tool discovery guidance messaging.
  - `cli-generator.test.ts` assertion for permissive create input schema generation.
- Verification:
  - `pnpm -C packages/constructive-agent-pi-extension test` (pass)
  - `pnpm -C packages/constructive-agent-pi-extension exec tsc -p tsconfig.json --noEmit` (pass)
  - `pnpm -C graphql/codegen exec jest -u src/__tests__/codegen/cli-generator.test.ts` (pass, snapshot updated)
  - `pnpm -C graphql/codegen exec tsc -p tsconfig.json --noEmit` (pass)

## 2026-02-24 - Explore Failure Diagnostics Hardening
- Reproduced endpoint response shape for invalid auth:
  - HTTP 200 with GraphQL errors containing only `extensions.code` and no `message`.
  - Example: `{"errors":[{"extensions":{"code":"UNAUTHENTICATED"}}]}`.
- Implemented robust GraphQL error extraction in `graphql/codegen` introspection fetch path:
  - preserve `message` when present
  - fallback to `extensions.code` (e.g. `UNAUTHENTICATED`)
  - fallback to serialized error object when both are missing
  - improved non-JSON response diagnostics with content-type and body snippet
  - improved non-2xx diagnostics with response body snippet
- Implemented richer explore failure summary in PI extension:
  - includes endpoint/token-source context when available
  - adds auth remediation hints for unauthenticated/forbidden/401/403-style failures
  - includes concrete next commands (`cnc auth status`, `cnc auth set-token`, `/constructive-auth-set`)
- Added regression tests:
  - `graphql/codegen/src/__tests__/introspect/fetch-schema.test.ts`
  - `packages/constructive-agent-pi-extension/__tests__/unit/explore-service.test.ts`
- Verification:
  - `pnpm -C graphql/codegen test` (pass)
  - `pnpm -C graphql/codegen exec tsc -p tsconfig.json --noEmit` (pass)
  - `pnpm -C packages/constructive-agent-pi-extension test` (pass)
  - `pnpm -C packages/constructive-agent-pi-extension exec tsc -p tsconfig.json --noEmit` (pass)
