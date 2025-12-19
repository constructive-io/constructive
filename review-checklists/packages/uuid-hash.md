# Review checklist — `packages/uuid-hash`

## Context
- Compare: `main...HEAD` (merge base `86d74dc4fce9051df0d2b5bcc163607aba42f009`)
- Branch: `refactor/ensure-new-name-mappings`
- Folder move: `packages/uuid-hash` → `streaming/uuid-hash`

## How to review
- Content changes link to per-file diff docs under `review-checklists/diffs/`
- Each diff doc includes Prev/Next navigation

## Package.json checks
- [ ] `name` unchanged: `uuid-hash`

## Renamed / moved (no content changes) (8)
<details>
<summary>Show 8 rename-only paths</summary>

- [ ] `R100` `packages/uuid-hash/CHANGELOG.md` → `streaming/uuid-hash/CHANGELOG.md`
- [ ] `R100` `packages/uuid-hash/README.md` → `streaming/uuid-hash/README.md`
- [ ] `R100` `packages/uuid-hash/__tests__/__snapshots__/uuid-hash.test.ts.snap` → `streaming/uuid-hash/__tests__/__snapshots__/uuid-hash.test.ts.snap`
- [ ] `R100` `packages/uuid-hash/__tests__/uuid-hash.test.ts` → `streaming/uuid-hash/__tests__/uuid-hash.test.ts`
- [ ] `R100` `packages/uuid-hash/jest.config.js` → `streaming/uuid-hash/jest.config.js`
- [ ] `R100` `packages/uuid-hash/src/index.ts` → `streaming/uuid-hash/src/index.ts`
- [ ] `R100` `packages/uuid-hash/tsconfig.esm.json` → `streaming/uuid-hash/tsconfig.esm.json`
- [ ] `R100` `packages/uuid-hash/tsconfig.json` → `streaming/uuid-hash/tsconfig.json`

</details>

## Renamed / moved (with content changes) (1)
- [ ] `R096` `packages/uuid-hash/package.json` → `streaming/uuid-hash/package.json` (`+1/-1`) — diff: [R096_cf899dfa43d6.md](../diffs/R096_cf899dfa43d6.md)

## Grep checks
- [ ] `rg -n 'LaunchQL|launchql' streaming/uuid-hash`
- [ ] `rg -n '@launchql/' streaming/uuid-hash`
