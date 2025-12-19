# Review checklist — `packages/pg-ast`

## Context
- Compare: `main...HEAD` (merge base `86d74dc4fce9051df0d2b5bcc163607aba42f009`)
- Branch: `refactor/ensure-new-name-mappings`
- Folder move: `packages/pg-ast` → `postgres/pg-ast`

## How to read linked diffs
- Module entries link to `review-checklists/diffs/*.md` with side-by-side output (`diff -y`).
- Left = `main`, Right = `HEAD`
- Legend: `|` changed, `<` only in `main`, `>` only in `HEAD`

## Package.json checks
- [ ] `name` unchanged: `pg-ast`

## Renamed / moved (no content changes) (12)
<details>
<summary>Show 12 rename-only paths</summary>

- [ ] `R100` `packages/pg-ast/CHANGELOG.md` → `postgres/pg-ast/CHANGELOG.md`
- [ ] `R100` `packages/pg-ast/README.md` → `postgres/pg-ast/README.md`
- [ ] `R100` `packages/pg-ast/__tests__/__snapshots__/pg-ast.test.ts.snap` → `postgres/pg-ast/__tests__/__snapshots__/pg-ast.test.ts.snap`
- [ ] `R100` `packages/pg-ast/__tests__/pg-ast.test.ts` → `postgres/pg-ast/__tests__/pg-ast.test.ts`
- [ ] `R100` `packages/pg-ast/jest.config.js` → `postgres/pg-ast/jest.config.js`
- [ ] `R100` `packages/pg-ast/pg_query.proto` → `postgres/pg-ast/pg_query.proto`
- [ ] `R100` `packages/pg-ast/scripts/pg-proto-parser.ts` → `postgres/pg-ast/scripts/pg-proto-parser.ts`
- [ ] `R100` `packages/pg-ast/src/asts.ts` → `postgres/pg-ast/src/asts.ts`
- [ ] `R100` `packages/pg-ast/src/index.ts` → `postgres/pg-ast/src/index.ts`
- [ ] `R100` `packages/pg-ast/src/wrapped.ts` → `postgres/pg-ast/src/wrapped.ts`
- [ ] `R100` `packages/pg-ast/tsconfig.esm.json` → `postgres/pg-ast/tsconfig.esm.json`
- [ ] `R100` `packages/pg-ast/tsconfig.json` → `postgres/pg-ast/tsconfig.json`

</details>

## Renamed / moved (with content changes) (1)
- [ ] `R096` `packages/pg-ast/package.json` → `postgres/pg-ast/package.json` (`+1/-1`) — diff: [R096_baaf3da21435.md](../diffs/R096_baaf3da21435.md)

## Grep checks
- [ ] `rg -n 'LaunchQL|launchql' postgres/pg-ast`
- [ ] `rg -n '@launchql/' postgres/pg-ast`
