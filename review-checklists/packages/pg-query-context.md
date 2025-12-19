# Review checklist — `packages/pg-query-context`

## Context
- Compare: `main...HEAD` (merge base `86d74dc4fce9051df0d2b5bcc163607aba42f009`)
- Branch: `refactor/ensure-new-name-mappings`
- Folder move: `packages/pg-query-context` → `postgres/pg-query-context`

## How to review
- Content changes link to per-file diff docs under `review-checklists/diffs/`
- Each diff doc includes Prev/Next navigation

## Package.json checks
- [ ] `name` unchanged: `pg-query-context`

## Renamed / moved (no content changes) (6)
<details>
<summary>Show 6 rename-only paths</summary>

- [ ] `R100` `packages/pg-query-context/CHANGELOG.md` → `postgres/pg-query-context/CHANGELOG.md`
- [ ] `R100` `packages/pg-query-context/README.md` → `postgres/pg-query-context/README.md`
- [ ] `R100` `packages/pg-query-context/jest.config.js` → `postgres/pg-query-context/jest.config.js`
- [ ] `R100` `packages/pg-query-context/src/index.ts` → `postgres/pg-query-context/src/index.ts`
- [ ] `R100` `packages/pg-query-context/tsconfig.esm.json` → `postgres/pg-query-context/tsconfig.esm.json`
- [ ] `R100` `packages/pg-query-context/tsconfig.json` → `postgres/pg-query-context/tsconfig.json`

</details>

## Renamed / moved (with content changes) (1)
- [ ] `R096` `packages/pg-query-context/package.json` → `postgres/pg-query-context/package.json` (`+1/-1`) — diff: [R096_05e256869ae0.md](../diffs/R096_05e256869ae0.md)

## Grep checks
- [ ] `rg -n 'LaunchQL|launchql' postgres/pg-query-context`
- [ ] `rg -n '@launchql/' postgres/pg-query-context`
