# Review checklist — `packages/launchql-gen`

## Context
- Compare: `main...HEAD` (merge base `86d74dc4fce9051df0d2b5bcc163607aba42f009`)
- Branch: `refactor/ensure-new-name-mappings`
- Folder move: `packages/launchql-gen` → `graphql/codegen`

## How to read linked diffs
- Module entries link to `review-checklists/diffs/*.md` with side-by-side output (`diff -y`).
- Left = `main`, Right = `HEAD`
- Legend: `|` changed, `<` only in `main`, `>` only in `HEAD`

## Package.json checks
- [ ] `name`: `@launchql/codegen` → `@constructive-io/graphql-codegen`
- [ ] `keywords` updated
- [ ] `devDependencies` updated

## Renamed / moved (no content changes) (20)
<details>
<summary>Show 20 rename-only paths</summary>

- [ ] `R100` `packages/launchql-gen/__fixtures__/api.json` → `graphql/codegen/__fixtures__/api.json`
- [ ] `R100` `packages/launchql-gen/__fixtures__/api/mutations.json` → `graphql/codegen/__fixtures__/api/mutations.json`
- [ ] `R100` `packages/launchql-gen/__fixtures__/api/queries.json` → `graphql/codegen/__fixtures__/api/queries.json`
- [ ] `R100` `packages/launchql-gen/__fixtures__/api/query-nested-selection-many.json` → `graphql/codegen/__fixtures__/api/query-nested-selection-many.json`
- [ ] `R100` `packages/launchql-gen/__fixtures__/api/query-nested-selection-one.json` → `graphql/codegen/__fixtures__/api/query-nested-selection-one.json`
- [ ] `R100` `packages/launchql-gen/__fixtures__/mutations.json` → `graphql/codegen/__fixtures__/mutations.json`
- [ ] `R100` `packages/launchql-gen/__fixtures__/queries.json` → `graphql/codegen/__fixtures__/queries.json`
- [ ] `R100` `packages/launchql-gen/__fixtures__/tables.js` → `graphql/codegen/__fixtures__/tables.js`
- [ ] `R100` `packages/launchql-gen/__tests__/__snapshots__/codegen.fixtures.test.ts.snap` → `graphql/codegen/__tests__/__snapshots__/codegen.fixtures.test.ts.snap`
- [ ] `R100` `packages/launchql-gen/__tests__/__snapshots__/codegen.test.ts.snap` → `graphql/codegen/__tests__/__snapshots__/codegen.test.ts.snap`
- [ ] `R100` `packages/launchql-gen/__tests__/__snapshots__/granular.test.ts.snap` → `graphql/codegen/__tests__/__snapshots__/granular.test.ts.snap`
- [ ] `R100` `packages/launchql-gen/__tests__/codegen.fixtures.test.ts` → `graphql/codegen/__tests__/codegen.fixtures.test.ts`
- [ ] `R100` `packages/launchql-gen/__tests__/gql.mutations.test.ts` → `graphql/codegen/__tests__/gql.mutations.test.ts`
- [ ] `R100` `packages/launchql-gen/__tests__/granular.test.ts` → `graphql/codegen/__tests__/granular.test.ts`
- [ ] `R100` `packages/launchql-gen/jest.config.js` → `graphql/codegen/jest.config.js`
- [ ] `R100` `packages/launchql-gen/src/gql.ts` → `graphql/codegen/src/gql.ts`
- [ ] `R100` `packages/launchql-gen/src/index.ts` → `graphql/codegen/src/index.ts`
- [ ] `R100` `packages/launchql-gen/test-utils/generate-from-introspection.ts` → `graphql/codegen/test-utils/generate-from-introspection.ts`
- [ ] `R100` `packages/launchql-gen/tsconfig.esm.json` → `graphql/codegen/tsconfig.esm.json`
- [ ] `R100` `packages/launchql-gen/tsconfig.json` → `graphql/codegen/tsconfig.json`

</details>

## Renamed / moved (with content changes) (7)
- [ ] `R079` `packages/launchql-gen/README.md` → `graphql/codegen/README.md` (`+7/-7`) — diff: [R079_ef1f28468c8d.md](../diffs/R079_ef1f28468c8d.md)
- [ ] `R089` `packages/launchql-gen/__tests__/codegen.test.ts` → `graphql/codegen/__tests__/codegen.test.ts` (`+4/-4`) — diff: [R089_1319d0fcb884.md](../diffs/R089_1319d0fcb884.md)
- [ ] `R081` `packages/launchql-gen/__tests__/options.test.ts` → `graphql/codegen/__tests__/options.test.ts` (`+6/-6`) — diff: [R081_c831120c5480.md](../diffs/R081_c831120c5480.md)
- [ ] `R091` `packages/launchql-gen/package.json` → `graphql/codegen/package.json` (`+4/-4`) — diff: [R091_d8941a64a295.md](../diffs/R091_d8941a64a295.md)
- [ ] `R056` `packages/launchql-gen/sql/test.sql` → `graphql/codegen/sql/test.sql` (`+9/-9`) — diff: [R056_1cb59c44f3ad.md](../diffs/R056_1cb59c44f3ad.md)
- [ ] `R089` `packages/launchql-gen/src/codegen.ts` → `graphql/codegen/src/codegen.ts` (`+12/-12`) — diff: [R089_57e05d44ccda.md](../diffs/R089_57e05d44ccda.md)
- [ ] `R083` `packages/launchql-gen/src/options.ts` → `graphql/codegen/src/options.ts` (`+5/-5`) — diff: [R083_27e6a534dc8b.md](../diffs/R083_27e6a534dc8b.md)

## Added (1)
- [ ] `A` `graphql/codegen/CHANGELOG.md` — content: [A_8d7ead3cf1a3.md](../diffs/A_8d7ead3cf1a3.md)

## Deleted (1)
- [ ] `D` `packages/launchql-gen/CHANGELOG.md` — content: [D_72e0a976c245.md](../diffs/D_72e0a976c245.md)

## Grep checks
- [ ] `rg -n 'LaunchQL|launchql' graphql/codegen`
- [ ] `rg -n '@launchql/' graphql/codegen`
