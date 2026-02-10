# GraphQL Codegen v5 Handover

## Purpose
This document captures the current state of the `@constructive-io/graphql-codegen` PostGraphile v5 migration work, what was changed, why it was changed, and what still needs verification/hardening.

## Scope
- Primary package: `graphql/codegen`
- Validation harness: `graphql/test-app` (`@constructive-io/test-codegen-app`)
- Target server for live validation: `http://api.localhost:3000/graphql`
- Branch context: `feat/codegen-v5-on-develop-v5`

## Migration Goals
1. Keep one core generation/runtime model for ORM and React Query outputs.
2. Make generated output fully compatible with PostGraphile v5 schema shapes.
3. Preserve or improve TypeScript DX (autocomplete, contextual typing, strict invalid-field detection).
4. Keep generated runtime behavior stable for both ORM and React Query modes.

## What Was Refactored

### 1. Core generation model (ORM-first, reused by hooks)
- React Query generation now delegates to ORM-style argument/result contracts instead of maintaining a separate logic core.
- This reduces divergence between `orm` output and `react-query` output and removes duplicated behavior paths.

Implementation anchors:
- `graphql/codegen/src/core/generate.ts`
- `graphql/codegen/src/core/codegen/index.ts`
- `graphql/codegen/src/core/codegen/orm/**`
- `graphql/codegen/src/core/codegen/queries.ts`
- `graphql/codegen/src/core/codegen/mutations.ts`

### 2. `findOne` compatibility for v5 schemas
- Some v5 schemas may not expose dedicated single-row query fields in the same way as earlier versions.
- Model generator now supports `findOne` via collection query fallback when unique single lookup is not available.
- Fallback behavior: query collection with `where: { pk: { equalTo: ... } }`, `first: 1`, then map first node to the single result shape.

Implementation anchor:
- `graphql/codegen/src/core/codegen/orm/model-generator.ts`

Related test coverage:
- `graphql/codegen/src/__tests__/codegen/model-generator.test.ts`
  - includes case: "generates findOne via collection query when single lookup is unavailable"

### 3. Hook API namespacing and argument mapping
- GraphQL-specific selection inputs are now namespaced under `selection`.
- React Query options remain top-level and pass-through (not namespaced).
- Runtime helper enforces `selection.fields` presence and maps to ORM args.

Expected hook shape:
- `useXQuery({ selection: { fields: { ... }, where, orderBy, first, ... }, ...reactQueryOptions })`

Runtime mapping helper:
- `graphql/codegen/src/core/codegen/templates/hooks-selection.ts`
  - `buildSelectionArgs`
  - `buildListSelectionArgs`
  - runtime guard for missing `selection.fields`

### 4. TypeScript DX hardening (contextual typing + strictness)
Key issues addressed:
- Prior generic patterns degraded contextual typing in nested selections.
- Deep exactness in large/cyclic v5 relation graphs can become too expensive or unstable.

Current approach:
- Hook signatures use `selection.fields: S` style overload typing to preserve contextual typing and autocomplete.
- Strictness is enforced with hook-specific guard type:
  - `HookStrictSelect<S, Shape> = S extends DeepExact<S, Shape, 5> ? {} : never`
- `NoInfer<S>` is used in strict-select intersections to avoid inference pollution from strictness checks.

Implementation anchors:
- `graphql/codegen/src/core/codegen/hooks-ast.ts`
- `graphql/codegen/src/core/codegen/queries.ts`
- `graphql/codegen/src/core/codegen/custom-queries.ts`
- `graphql/codegen/src/core/codegen/mutations.ts`
- `graphql/codegen/src/core/codegen/custom-mutations.ts`
- `graphql/codegen/src/core/codegen/templates/select-types.ts`
- `graphql/codegen/src/core/codegen/orm/select-types.ts`

### 5. Generation pipeline and CLI cleanup
- Generation orchestration remains source-agnostic (`endpoint` or `schemaFile`) with shared pipeline.
- Type hole in generation pipeline local variable was tightened:
  - `pipelineResult: Awaited<ReturnType<typeof runCodegenPipeline>>`
- Deprecated no-op CLI option `--browser-compatible` was removed.

Implementation anchors:
- `graphql/codegen/src/core/generate.ts`
- `graphql/codegen/src/cli/index.ts`

## Generated Output Contract (Current)

### React Query output
- Query hooks require `selection.fields` (compile-time and runtime).
- GraphQL arguments come from `selection` object:
  - single: `selection.fields`
  - list: `selection.fields` + pagination/filter/sort members
- React Query options remain direct (`enabled`, `select`, `retry`, etc.).
- `fetch*` and `prefetch*` helpers use the same `selection` contract.

### ORM output
- Model methods enforce select typing and strictness for selection structure.
- `findOne` remains available as API surface, backed by either native single query field or list fallback.
- Custom operations remain generated and typed; nested select support is retained.

## Testing and Verification Done

### Package-level tests
- `graphql/codegen` unit/snapshot tests expanded for v5 behavior and typing patterns.
- Snapshots were updated to represent the new generated API shapes.

### Integration harness (`graphql/test-app`)
- Added/expanded as local validation app for generated SDKs.
- Verifies:
  - React Query hooks against live endpoint
  - ORM client against live endpoint
  - Type-only checks for generated usage patterns

Key commands:
```bash
pnpm --filter @constructive-io/graphql-codegen test -u
pnpm --filter @constructive-io/graphql-codegen build
pnpm --filter @constructive-io/test-codegen-app run codegen
pnpm --filter @constructive-io/test-codegen-app run test:types
pnpm --filter @constructive-io/test-codegen-app run test:integration:live
```

Observed live status in latest runs:
- `test:integration:live` has passed end-to-end for both suites:
  - `React Query Hooks (live endpoint)`
  - `ORM Client (live endpoint)`

## Known Constraints and Tradeoffs
1. `HookStrictSelect` uses depth-capped exactness (depth `5`) to balance correctness and editor responsiveness.
2. Full uncapped deep exactness is intentionally avoided for v5-scale cyclic schemas due to TS performance/circularity risk.
3. Live integration tests depend on local server state and auth fixtures; occasional environment/setup drift can fail otherwise-correct code.
4. React test warnings about `react-test-renderer` deprecation are test-runtime warnings, not codegen contract failures.

## Search Plugin Integration

After rebasing onto `develop-v5` (which merged the fulltext search plugin), codegen automatically handles search-related entities:
- `FulltextSearch` entities are detected from `FulltextSearchesConnection` types via standard introspection.
- `FulltextSearchFilter` input types are generated in `input-types.ts` when present in the schema.
- No special-casing is needed — the existing Connection-based entity detection handles search entities generically.
- Test coverage added in `infer-tables.test.ts` confirming search entity detection from introspection.

## Post-Rebase Verification Results

After rebasing onto the fulltext search plugin merge (commit `edcb3060e`):
- `pnpm build` — clean
- `pnpm test` — 230 tests pass, 75 snapshots match
- No regressions from search plugin additions

### 6. Update mutation patch field names (v5 convention)
PostGraphile v5 uses entity-specific patch field names in update mutation inputs:
```
UpdateUserInput     → { id: UUID!, userPatch: UserPatch! }
UpdateDatabaseInput → { id: UUID!, databasePatch: DatabasePatch! }
```
Pattern: `{lcFirst(entityTypeName)}Patch`

Previously, codegen hardcoded `patch` as the field name, which broke all 92 update mutations at runtime against v5 servers.

Fix:
- Introspection now extracts the actual patch field name from `UpdateXxxInput` types (`infer-tables.ts`)
- `TableQueryNames.patchFieldName` carries the discovered name through the pipeline
- Generated `UpdateXxxInput` types, ORM model `update()` calls, query builder templates, and React Query mutation hooks all use the entity-specific name
- Fallback: `{lcFirst(entityTypeName)}Patch` when introspection is unavailable

Implementation anchors:
- `graphql/codegen/src/core/introspect/infer-tables.ts` — `inferPatchFieldName()`
- `graphql/codegen/src/types/schema.ts` — `TableQueryNames.patchFieldName`
- `graphql/codegen/src/core/codegen/orm/input-types-generator.ts` — dynamic field name in `UpdateXxxInput`
- `graphql/codegen/src/core/codegen/templates/query-builder.ts` — `patchFieldName` parameter on `buildUpdateByPkDocument`
- `graphql/codegen/src/core/codegen/orm/model-generator.ts` — passes `patchFieldName` to query builder
- `graphql/codegen/src/core/codegen/mutations.ts` — entity-specific field name in hook variable type

## Remaining Audit Checklist
1. ~~Re-run generation + type/live tests whenever backend schema changes.~~ Done post-rebase.
2. Spot-check nested relation selection autocomplete in IDE for large objects.
3. Verify custom query/mutation payload selections for non-table-root operations.
4. ~~Reconfirm `findOne` fallback behavior on entities that lack dedicated single-row fields.~~ Covered by new multi-entity fallback test.
5. Keep snapshot and docs aligned when generated signature shapes change.

## Practical Debug Guide

### If `selection` typing regresses
- Check `withFieldsSelectionType` / `withFieldsListSelectionType` in `hooks-ast.ts`.
- Check whether `NoInfer<S>` is still applied in strict select intersections.
- Check whether generated signatures still force `selection.fields: S` in overloads.

### If nested invalid fields are not rejected
- Check `HookStrictSelect` definitions in both select-type templates:
  - `graphql/codegen/src/core/codegen/templates/select-types.ts`
  - `graphql/codegen/src/core/codegen/orm/select-types.ts`
- Ensure generated imports include `HookStrictSelect` and `NoInfer` usage paths.

### If `findOne` fails on a v5 schema
- Confirm whether a single-row query exists for that table.
- If absent, validate generated fallback query and transform in:
  - `graphql/codegen/src/core/codegen/orm/model-generator.ts`

## Recent Migration Commits (Reference)
1. `a4b928bdb` `refactor(graphql-codegen): migrate core generator to v5`
2. `0ee86f351` `test(graphql-codegen): expand v5 coverage and snapshots`
3. `3a3271e3e` `chore(graphql-codegen): refresh docs examples and metadata`
4. `bd4f00ccc` `feat(test-codegen-app): add local v5 integration harness`

## Definition of Done for This Migration Track
1. Generated ORM and React Query outputs are feature-complete against local PostGraphile v5 schema.
2. Type-level DX (autocomplete, contextual typing, strictness) is stable and non-regressive versus expected baseline.
3. Live integration and type tests in `graphql/test-app` remain green after schema refresh/regeneration.
4. Documentation remains aligned with actual generated contracts (`selection` API and fallback behavior).
