# GraphQL Codegen PostGraphile v5 Migration Plan

## Goal
Migrate `graphql/codegen` to be fully compatible with PostGraphile v5 on branch `develop-v5`, while using `main` as the source-of-truth baseline for codegen architecture and behavior.

## Scope
- In scope:
  - `graphql/codegen` only
  - Validation against the v5-compatible backend in `packages/server` on `develop-v5`
- Out of scope:
  - Refactoring other packages in this pass
  - Reworking `packages/server` internals (already migrated by backend work)

## Key Constraints
- Baseline for codegen must come from `main`, not existing `develop-v5` codegen state.
- PostGraphile v5 server contract lives in `packages/server` on `develop-v5`.
- ORM and React Query output modes must both pass verification.
- Keep the current architectural direction:
  - React Query output mode delegates to ORM runtime core
  - Strong TypeScript correctness and autocomplete behavior are mandatory

## Branch Strategy
1. Start from `origin/develop-v5`.
2. Create a dedicated migration branch on top (e.g. `feat/codegen-v5-on-develop-v5`).
3. Replace `graphql/codegen` contents with `origin/main` version (explicit override baseline).
4. Apply only required v5 compatibility patches on top.

## Migration Workstreams

### 1) Baseline Override
- Copy `graphql/codegen` from `main` into the new branch.
- Keep all non-codegen files from `develop-v5` unchanged.
- Resolve lockfile/package drift only where needed for codegen build/test.

### 2) GraphQL 16 / AST Compatibility
- Ensure GraphQL operation/kind enum usage is compatible with v5/GraphQL 16 expectations.
- Audit and patch any remaining string-literal AST node usages that break typing/runtime.
- Confirm template-copied runtime files are also compatible (especially query-builder template paths).

### 3) Codegen-to-Server Contract Alignment (v5)
- Remove v4-only assumptions in codegen DB schema build calls.
- Align schema-fetch/introspection behavior with v5 server exposure.
- Verify source mode behavior:
  - endpoint-based codegen
  - schema-file codegen
  - db-backed codegen (where applicable)

### 4) `findOne` Refactor for v5 Unique Lookup Changes
- Problem:
  - v5 preset usage may remove unique/single lookup query fields.
- Required behavior:
  - Generated `findOne` API remains available for consumers.
  - Internally it must not depend on dedicated single-row GraphQL query fields.
- Planned approach:
  - Build `findOne` via collection query + filter + `first: 1`, then map first node/null.
  - Make table metadata/query-name typing reflect optional absence of single query field.
  - Ensure custom operation separation logic does not assume single query existence.

### 5) Type System and DX Safeguards
- Preserve the current selection-first API and strict select validation.
- Keep React Query options pass-through behavior distinct from GraphQL selection args.
- Re-validate overload signatures and inference behavior for nested selection autocomplete.
- Ensure no regressions in ORM-generated types and RQ-generated hook signatures.

## Verification Matrix

### A. Unit/Snapshot/Type Tests (`graphql/codegen`)
- Run package tests and snapshot updates as needed.
- Add/adjust tests for:
  - no-single-query schema scenarios
  - `findOne` fallback behavior
  - strict select typing and nested autocomplete constraints
  - React Query option typing interplay with selection args

### B. Integration Against v5 Backend (`packages/server`)
- On `develop-v5`, spin up v5 backend from `packages/server` for local endpoint testing.
- Generate code from live endpoint and verify:
  - ORM output compiles and runtime smoke tests pass
  - React Query output compiles and hook typechecks pass

### C. Downstream Dependents of Codegen
- Verify direct dependents that consume generated outputs and/or CLI path:
  - `packages/cli`
  - `examples/codegen-integration`
  - local test app package used for codegen validation in this repo (if present on branch)

## Suggested Commit Slicing
1. `chore(codegen): override develop-v5 codegen with main baseline`
2. `fix(codegen): align graphql16 and v5 schema build contracts`
3. `refactor(codegen): decouple findOne from single-query fields`
4. `test(codegen): add v5 unique-lookup and type safety coverage`
5. `docs(codegen): document v5 assumptions and migration notes`

## Risks and Mitigations
- Risk: Hidden assumptions about unique lookup fields in generated runtime.
  - Mitigation: explicit no-single-query tests + endpoint integration checks.
- Risk: GraphQL 16 AST typing/runtime mismatch in template-generated files.
  - Mitigation: audit both generator code and copied templates.
- Risk: Regressions in selection/autocomplete behavior.
  - Mitigation: keep strict type tests and nested-selection inference tests as merge gates.

## Definition of Done
- `graphql/codegen` baseline from `main` is active on top of `develop-v5`.
- Codegen builds/tests/typechecks pass.
- Endpoint-based generation against local `packages/server` v5 instance succeeds.
- ORM and React Query outputs both pass compile + type-level verification.
- No unresolved contract gaps between generated code and v5 backend schema shape.
