# Review checklist — `packages/pg-codegen`

## Context
- Compare: `main...HEAD` (merge base `86d74dc4fce9051df0d2b5bcc163607aba42f009`)
- Branch: `refactor/ensure-new-name-mappings`
- Folder move: `packages/pg-codegen` → `postgres/pg-codegen`

## How to read linked diffs
- Module entries link to `review-checklists/diffs/*.md` with side-by-side output (`diff -y`).
- Left = `main`, Right = `HEAD`
- Legend: `|` changed, `<` only in `main`, `>` only in `HEAD`

## Package.json checks
- [ ] `name` unchanged: `pg-codegen`
- [ ] `keywords` updated

## Renamed / moved (no content changes) (14)
<details>
<summary>Show 14 rename-only paths</summary>

- [ ] `R100` `packages/pg-codegen/CHANGELOG.md` → `postgres/pg-codegen/CHANGELOG.md`
- [ ] `R100` `packages/pg-codegen/README.md` → `postgres/pg-codegen/README.md`
- [ ] `R100` `packages/pg-codegen/__tests__/__snapshots__/codegen.test.ts.snap` → `postgres/pg-codegen/__tests__/__snapshots__/codegen.test.ts.snap`
- [ ] `R100` `packages/pg-codegen/__tests__/codegen.test.ts` → `postgres/pg-codegen/__tests__/codegen.test.ts`
- [ ] `R100` `packages/pg-codegen/jest.config.js` → `postgres/pg-codegen/jest.config.js`
- [ ] `R100` `packages/pg-codegen/sql/test.sql` → `postgres/pg-codegen/sql/test.sql`
- [ ] `R100` `packages/pg-codegen/src/codegen/codegen.ts` → `postgres/pg-codegen/src/codegen/codegen.ts`
- [ ] `R100` `packages/pg-codegen/src/codegen/namespaces.ts` → `postgres/pg-codegen/src/codegen/namespaces.ts`
- [ ] `R100` `packages/pg-codegen/src/index.ts` → `postgres/pg-codegen/src/index.ts`
- [ ] `R100` `packages/pg-codegen/src/introspect.ts` → `postgres/pg-codegen/src/introspect.ts`
- [ ] `R100` `packages/pg-codegen/src/query.ts` → `postgres/pg-codegen/src/query.ts`
- [ ] `R100` `packages/pg-codegen/src/types.ts` → `postgres/pg-codegen/src/types.ts`
- [ ] `R100` `packages/pg-codegen/tsconfig.esm.json` → `postgres/pg-codegen/tsconfig.esm.json`
- [ ] `R100` `packages/pg-codegen/tsconfig.json` → `postgres/pg-codegen/tsconfig.json`

</details>

## Renamed / moved (with content changes) (1)
- [ ] `R095` `packages/pg-codegen/package.json` → `postgres/pg-codegen/package.json` (`+2/-2`) — diff: [R095_8c3e9a53e384.md](../diffs/R095_8c3e9a53e384.md)

## Grep checks
- [ ] `rg -n 'LaunchQL|launchql' postgres/pg-codegen`
- [ ] `rg -n '@launchql/' postgres/pg-codegen`
