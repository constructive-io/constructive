# Review checklist — `packages/pgsql-test`

## Context
- Compare: `main...HEAD` (merge base `86d74dc4fce9051df0d2b5bcc163607aba42f009`)
- Branch: `refactor/ensure-new-name-mappings`
- Folder move: `packages/pgsql-test` → `postgres/pgsql-test`

## How to read linked diffs
- Module entries link to `review-checklists/diffs/*.md` with side-by-side output (`diff -y`).
- Left = `main`, Right = `HEAD`
- Legend: `|` changed, `<` only in `main`, `>` only in `HEAD`

## Package.json checks
- [ ] `name` unchanged: `pgsql-test`
- [ ] `keywords` updated

## Renamed / moved (no content changes) (43)
<details>
<summary>Show 43 rename-only paths</summary>

- [ ] `R100` `packages/pgsql-test/CHANGELOG.md` → `postgres/pgsql-test/CHANGELOG.md`
- [ ] `R100` `packages/pgsql-test/README.md` → `postgres/pgsql-test/README.md`
- [ ] `R100` `packages/pgsql-test/__tests__/postgres-test.auth-methods.test.ts` → `postgres/pgsql-test/__tests__/postgres-test.auth-methods.test.ts`
- [ ] `R100` `packages/pgsql-test/__tests__/postgres-test.connections.test.ts` → `postgres/pgsql-test/__tests__/postgres-test.connections.test.ts`
- [ ] `R100` `packages/pgsql-test/__tests__/postgres-test.csv-edge-cases.test.ts` → `postgres/pgsql-test/__tests__/postgres-test.csv-edge-cases.test.ts`
- [ ] `R100` `packages/pgsql-test/__tests__/postgres-test.csv-optional-fields.test.ts` → `postgres/pgsql-test/__tests__/postgres-test.csv-optional-fields.test.ts`
- [ ] `R100` `packages/pgsql-test/__tests__/postgres-test.csv-subset-header.test.ts` → `postgres/pgsql-test/__tests__/postgres-test.csv-subset-header.test.ts`
- [ ] `R100` `packages/pgsql-test/__tests__/postgres-test.csv.test.ts` → `postgres/pgsql-test/__tests__/postgres-test.csv.test.ts`
- [ ] `R100` `packages/pgsql-test/__tests__/postgres-test.grants.test.ts` → `postgres/pgsql-test/__tests__/postgres-test.grants.test.ts`
- [ ] `R100` `packages/pgsql-test/__tests__/postgres-test.json.test.ts` → `postgres/pgsql-test/__tests__/postgres-test.json.test.ts`
- [ ] `R100` `packages/pgsql-test/__tests__/postgres-test.records.test.ts` → `postgres/pgsql-test/__tests__/postgres-test.records.test.ts`
- [ ] `R100` `packages/pgsql-test/__tests__/postgres-test.rollbacks.test.ts` → `postgres/pgsql-test/__tests__/postgres-test.rollbacks.test.ts`
- [ ] `R100` `packages/pgsql-test/__tests__/postgres-test.seed-methods.test.ts` → `postgres/pgsql-test/__tests__/postgres-test.seed-methods.test.ts`
- [ ] `R100` `packages/pgsql-test/__tests__/postgres-test.template.test.ts` → `postgres/pgsql-test/__tests__/postgres-test.template.test.ts`
- [ ] `R100` `packages/pgsql-test/__tests__/postgres-test.transations.test.ts` → `postgres/pgsql-test/__tests__/postgres-test.transations.test.ts`
- [ ] `R100` `packages/pgsql-test/__tests__/utils.test.ts` → `postgres/pgsql-test/__tests__/utils.test.ts`
- [ ] `R100` `packages/pgsql-test/csv/posts-escaped-quotes.csv` → `postgres/pgsql-test/csv/posts-escaped-quotes.csv`
- [ ] `R100` `packages/pgsql-test/csv/posts-quoted-commas.csv` → `postgres/pgsql-test/csv/posts-quoted-commas.csv`
- [ ] `R100` `packages/pgsql-test/csv/posts-subset-header.csv` → `postgres/pgsql-test/csv/posts-subset-header.csv`
- [ ] `R100` `packages/pgsql-test/csv/posts-with-optional.csv` → `postgres/pgsql-test/csv/posts-with-optional.csv`
- [ ] `R100` `packages/pgsql-test/csv/posts.csv` → `postgres/pgsql-test/csv/posts.csv`
- [ ] `R100` `packages/pgsql-test/csv/users.csv` → `postgres/pgsql-test/csv/users.csv`
- [ ] `R100` `packages/pgsql-test/jest.config.js` → `postgres/pgsql-test/jest.config.js`
- [ ] `R100` `packages/pgsql-test/sql/test.sql` → `postgres/pgsql-test/sql/test.sql`
- [ ] `R100` `packages/pgsql-test/src/admin.ts` → `postgres/pgsql-test/src/admin.ts`
- [ ] `R100` `packages/pgsql-test/src/connect.ts` → `postgres/pgsql-test/src/connect.ts`
- [ ] `R100` `packages/pgsql-test/src/context-utils.ts` → `postgres/pgsql-test/src/context-utils.ts`
- [ ] `R100` `packages/pgsql-test/src/index.ts` → `postgres/pgsql-test/src/index.ts`
- [ ] `R100` `packages/pgsql-test/src/manager.ts` → `postgres/pgsql-test/src/manager.ts`
- [ ] `R100` `packages/pgsql-test/src/roles.ts` → `postgres/pgsql-test/src/roles.ts`
- [ ] `R100` `packages/pgsql-test/src/seed/adapters.ts` → `postgres/pgsql-test/src/seed/adapters.ts`
- [ ] `R100` `packages/pgsql-test/src/seed/csv.ts` → `postgres/pgsql-test/src/seed/csv.ts`
- [ ] `R100` `packages/pgsql-test/src/seed/index.ts` → `postgres/pgsql-test/src/seed/index.ts`
- [ ] `R100` `packages/pgsql-test/src/seed/json.ts` → `postgres/pgsql-test/src/seed/json.ts`
- [ ] `R100` `packages/pgsql-test/src/seed/pgpm.ts` → `postgres/pgsql-test/src/seed/pgpm.ts`
- [ ] `R100` `packages/pgsql-test/src/seed/sql.ts` → `postgres/pgsql-test/src/seed/sql.ts`
- [ ] `R100` `packages/pgsql-test/src/seed/types.ts` → `postgres/pgsql-test/src/seed/types.ts`
- [ ] `R100` `packages/pgsql-test/src/stream.ts` → `postgres/pgsql-test/src/stream.ts`
- [ ] `R100` `packages/pgsql-test/src/test-client.ts` → `postgres/pgsql-test/src/test-client.ts`
- [ ] `R100` `packages/pgsql-test/src/utils.ts` → `postgres/pgsql-test/src/utils.ts`
- [ ] `R100` `packages/pgsql-test/test-utils/index.ts` → `postgres/pgsql-test/test-utils/index.ts`
- [ ] `R100` `packages/pgsql-test/tsconfig.esm.json` → `postgres/pgsql-test/tsconfig.esm.json`
- [ ] `R100` `packages/pgsql-test/tsconfig.json` → `postgres/pgsql-test/tsconfig.json`

</details>

## Renamed / moved (with content changes) (2)
- [ ] `R095` `packages/pgsql-test/__tests__/postgres-test.deploy-fast.test.ts` → `postgres/pgsql-test/__tests__/postgres-test.deploy-fast.test.ts` (`+3/-3`) — diff: [R095_6d85f2bb3947.md](../diffs/R095_6d85f2bb3947.md)
- [ ] `R096` `packages/pgsql-test/package.json` → `postgres/pgsql-test/package.json` (`+2/-2`) — diff: [R096_3fe5dd4b6dd3.md](../diffs/R096_3fe5dd4b6dd3.md)

## Added (1)
- [ ] `A` `postgres/pgsql-test/AGENTS.md` — content: [A_064ccea96430.md](../diffs/A_064ccea96430.md)

## Deleted (1)
- [ ] `D` `packages/pgsql-test/AGENTS.md` — content: [D_f48a15af2a39.md](../diffs/D_f48a15af2a39.md)

## Grep checks
- [ ] `rg -n 'LaunchQL|launchql' postgres/pgsql-test`
- [ ] `rg -n '@launchql/' postgres/pgsql-test`
