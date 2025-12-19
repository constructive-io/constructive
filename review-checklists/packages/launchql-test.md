# Review checklist — `packages/launchql-test`

## Context
- Compare: `main...HEAD` (merge base `86d74dc4fce9051df0d2b5bcc163607aba42f009`)
- Branch: `refactor/ensure-new-name-mappings`
- Folder move: `packages/launchql-test` → `graphql/test`

## How to read linked diffs
- Module entries link to `review-checklists/diffs/*.md` with side-by-side output (`diff -y`).
- Left = `main`, Right = `HEAD`
- Legend: `|` changed, `<` only in `main`, `>` only in `HEAD`

## Package.json checks
- [ ] `name`: `launchql-test` → `@constructive-io/graphql-test`
- [ ] `description` updated
- [ ] `keywords` updated
- [ ] `dependencies` updated

## Renamed / moved (no content changes) (29)
<details>
<summary>Show 29 rename-only paths</summary>

- [ ] `R100` `packages/launchql-test/__tests__/__snapshots__/graphile-test.graphile-tx.test.ts.snap` → `graphql/test/__tests__/__snapshots__/graphile-test.graphile-tx.test.ts.snap`
- [ ] `R100` `packages/launchql-test/__tests__/__snapshots__/graphile-test.graphql.test.ts.snap` → `graphql/test/__tests__/__snapshots__/graphile-test.graphql.test.ts.snap`
- [ ] `R100` `packages/launchql-test/__tests__/__snapshots__/graphile-test.roles.test.ts.snap` → `graphql/test/__tests__/__snapshots__/graphile-test.roles.test.ts.snap`
- [ ] `R100` `packages/launchql-test/__tests__/__snapshots__/graphile-test.test.ts.snap` → `graphql/test/__tests__/__snapshots__/graphile-test.test.ts.snap`
- [ ] `R100` `packages/launchql-test/__tests__/__snapshots__/graphile-test.types.positional.test.ts.snap` → `graphql/test/__tests__/__snapshots__/graphile-test.types.positional.test.ts.snap`
- [ ] `R100` `packages/launchql-test/__tests__/__snapshots__/graphile-test.types.positional.unwrapped.test.ts.snap` → `graphql/test/__tests__/__snapshots__/graphile-test.types.positional.unwrapped.test.ts.snap`
- [ ] `R100` `packages/launchql-test/__tests__/__snapshots__/graphile-test.types.test.ts.snap` → `graphql/test/__tests__/__snapshots__/graphile-test.types.test.ts.snap`
- [ ] `R100` `packages/launchql-test/__tests__/__snapshots__/graphile-test.types.unwrapped.test.ts.snap` → `graphql/test/__tests__/__snapshots__/graphile-test.types.unwrapped.test.ts.snap`
- [ ] `R100` `packages/launchql-test/__tests__/graphile-test.fail.test.ts` → `graphql/test/__tests__/graphile-test.fail.test.ts`
- [ ] `R100` `packages/launchql-test/__tests__/graphile-test.graphile-tx.test.ts` → `graphql/test/__tests__/graphile-test.graphile-tx.test.ts`
- [ ] `R100` `packages/launchql-test/__tests__/graphile-test.graphql.test.ts` → `graphql/test/__tests__/graphile-test.graphql.test.ts`
- [ ] `R100` `packages/launchql-test/__tests__/graphile-test.plugins.test.ts` → `graphql/test/__tests__/graphile-test.plugins.test.ts`
- [ ] `R100` `packages/launchql-test/__tests__/graphile-test.roles.test.ts` → `graphql/test/__tests__/graphile-test.roles.test.ts`
- [ ] `R100` `packages/launchql-test/__tests__/graphile-test.test.ts` → `graphql/test/__tests__/graphile-test.test.ts`
- [ ] `R100` `packages/launchql-test/__tests__/graphile-test.types.positional.test.ts` → `graphql/test/__tests__/graphile-test.types.positional.test.ts`
- [ ] `R100` `packages/launchql-test/__tests__/graphile-test.types.positional.unwrapped.test.ts` → `graphql/test/__tests__/graphile-test.types.positional.unwrapped.test.ts`
- [ ] `R100` `packages/launchql-test/__tests__/graphile-test.types.test.ts` → `graphql/test/__tests__/graphile-test.types.test.ts`
- [ ] `R100` `packages/launchql-test/__tests__/graphile-test.types.unwrapped.test.ts` → `graphql/test/__tests__/graphile-test.types.unwrapped.test.ts`
- [ ] `R100` `packages/launchql-test/jest.config.js` → `graphql/test/jest.config.js`
- [ ] `R100` `packages/launchql-test/sql/grants.sql` → `graphql/test/sql/grants.sql`
- [ ] `R100` `packages/launchql-test/sql/test.sql` → `graphql/test/sql/test.sql`
- [ ] `R100` `packages/launchql-test/src/get-connections.ts` → `graphql/test/src/get-connections.ts`
- [ ] `R100` `packages/launchql-test/src/graphile-test.ts` → `graphql/test/src/graphile-test.ts`
- [ ] `R100` `packages/launchql-test/src/index.ts` → `graphql/test/src/index.ts`
- [ ] `R100` `packages/launchql-test/src/utils.ts` → `graphql/test/src/utils.ts`
- [ ] `R100` `packages/launchql-test/test-utils/queries.ts` → `graphql/test/test-utils/queries.ts`
- [ ] `R100` `packages/launchql-test/test-utils/utils.ts` → `graphql/test/test-utils/utils.ts`
- [ ] `R100` `packages/launchql-test/tsconfig.esm.json` → `graphql/test/tsconfig.esm.json`
- [ ] `R100` `packages/launchql-test/tsconfig.json` → `graphql/test/tsconfig.json`

</details>

## Renamed / moved (with content changes) (2)
- [ ] `R086` `packages/launchql-test/README.md` → `graphql/test/README.md` (`+9/-9`) — diff: [R086_fbb48bcb1329.md](../diffs/R086_fbb48bcb1329.md)
- [ ] `R080` `packages/launchql-test/package.json` → `graphql/test/package.json` (`+6/-6`) — diff: [R080_903054f67017.md](../diffs/R080_903054f67017.md)

## Added (1)
- [ ] `A` `graphql/test/CHANGELOG.md` — content: [A_bd68b484e9cb.md](../diffs/A_bd68b484e9cb.md)

## Deleted (1)
- [ ] `D` `packages/launchql-test/CHANGELOG.md` — content: [D_92791053b50e.md](../diffs/D_92791053b50e.md)

## Grep checks
- [ ] `rg -n 'LaunchQL|launchql' graphql/test`
- [ ] `rg -n '@launchql/' graphql/test`
