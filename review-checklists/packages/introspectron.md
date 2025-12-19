# Review checklist — `packages/introspectron`

## Context
- Compare: `main...HEAD` (merge base `86d74dc4fce9051df0d2b5bcc163607aba42f009`)
- Branch: `refactor/ensure-new-name-mappings`
- Folder move: `packages/introspectron` → `postgres/introspectron`

## How to read linked diffs
- Module entries link to `review-checklists/diffs/*.md` with side-by-side output (`diff -y`).
- Left = `main`, Right = `HEAD`
- Legend: `|` changed, `<` only in `main`, `>` only in `HEAD`

## Package.json checks
- [ ] `name` unchanged: `introspectron`
- [ ] `keywords` updated
- [ ] `devDependencies` updated

## Renamed / moved (no content changes) (22)
<details>
<summary>Show 22 rename-only paths</summary>

- [ ] `R100` `packages/introspectron/CHANGELOG.md` → `postgres/introspectron/CHANGELOG.md`
- [ ] `R100` `packages/introspectron/README.md` → `postgres/introspectron/README.md`
- [ ] `R100` `packages/introspectron/__fixtures__/intro-query-dbe.json` → `postgres/introspectron/__fixtures__/intro-query-dbe.json`
- [ ] `R100` `packages/introspectron/__fixtures__/introQuery.json` → `postgres/introspectron/__fixtures__/introQuery.json`
- [ ] `R100` `packages/introspectron/__tests__/__snapshots__/gql.test.ts.snap` → `postgres/introspectron/__tests__/__snapshots__/gql.test.ts.snap`
- [ ] `R100` `packages/introspectron/__tests__/__snapshots__/introspect.test.ts.snap` → `postgres/introspectron/__tests__/__snapshots__/introspect.test.ts.snap`
- [ ] `R100` `packages/introspectron/__tests__/gql.test.ts` → `postgres/introspectron/__tests__/gql.test.ts`
- [ ] `R100` `packages/introspectron/__tests__/introspect.test.ts` → `postgres/introspectron/__tests__/introspect.test.ts`
- [ ] `R100` `packages/introspectron/__tests__/introspectron.sql.test.ts` → `postgres/introspectron/__tests__/introspectron.sql.test.ts`
- [ ] `R100` `packages/introspectron/jest.config.js` → `postgres/introspectron/jest.config.js`
- [ ] `R100` `packages/introspectron/sql/test.sql` → `postgres/introspectron/sql/test.sql`
- [ ] `R100` `packages/introspectron/src/gql-types.ts` → `postgres/introspectron/src/gql-types.ts`
- [ ] `R100` `packages/introspectron/src/gql.ts` → `postgres/introspectron/src/gql.ts`
- [ ] `R100` `packages/introspectron/src/index.ts` → `postgres/introspectron/src/index.ts`
- [ ] `R100` `packages/introspectron/src/introspect.ts` → `postgres/introspectron/src/introspect.ts`
- [ ] `R100` `packages/introspectron/src/introspectGql.ts` → `postgres/introspectron/src/introspectGql.ts`
- [ ] `R100` `packages/introspectron/src/pg-types.ts` → `postgres/introspectron/src/pg-types.ts`
- [ ] `R100` `packages/introspectron/src/process.ts` → `postgres/introspectron/src/process.ts`
- [ ] `R100` `packages/introspectron/src/query.ts` → `postgres/introspectron/src/query.ts`
- [ ] `R100` `packages/introspectron/src/utils.ts` → `postgres/introspectron/src/utils.ts`
- [ ] `R100` `packages/introspectron/tsconfig.esm.json` → `postgres/introspectron/tsconfig.esm.json`
- [ ] `R100` `packages/introspectron/tsconfig.json` → `postgres/introspectron/tsconfig.json`

</details>

## Renamed / moved (with content changes) (2)
- [ ] `R095` `packages/introspectron/__tests__/introspectron.gql.test.ts` → `postgres/introspectron/__tests__/introspectron.gql.test.ts` (`+1/-1`) — diff: [R095_4bb0b8d7b395.md](../diffs/R095_4bb0b8d7b395.md)
- [ ] `R091` `packages/introspectron/package.json` → `postgres/introspectron/package.json` (`+3/-3`) — diff: [R091_15b2c49df769.md](../diffs/R091_15b2c49df769.md)

## Grep checks
- [ ] `rg -n 'LaunchQL|launchql' postgres/introspectron`
- [ ] `rg -n '@launchql/' postgres/introspectron`
