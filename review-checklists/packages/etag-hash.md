# Review checklist — `packages/etag-hash`

## Context
- Compare: `main...HEAD` (merge base `86d74dc4fce9051df0d2b5bcc163607aba42f009`)
- Branch: `refactor/ensure-new-name-mappings`
- Folder move: `packages/etag-hash` → `streaming/etag-hash`

## How to review
- Content changes link to per-file diff docs under `review-checklists/diffs/`
- Each diff doc includes Prev/Next navigation

## Package.json checks
- [ ] `name` unchanged: `etag-hash`
- [ ] `keywords` updated

## Renamed / moved (no content changes) (8)
<details>
<summary>Show 8 rename-only paths</summary>

- [ ] `R100` `packages/etag-hash/CHANGELOG.md` → `streaming/etag-hash/CHANGELOG.md`
- [ ] `R100` `packages/etag-hash/README.md` → `streaming/etag-hash/README.md`
- [ ] `R100` `packages/etag-hash/__tests__/__snapshots__/etag-hash.test.ts.snap` → `streaming/etag-hash/__tests__/__snapshots__/etag-hash.test.ts.snap`
- [ ] `R100` `packages/etag-hash/__tests__/etag-hash.test.ts` → `streaming/etag-hash/__tests__/etag-hash.test.ts`
- [ ] `R100` `packages/etag-hash/jest.config.js` → `streaming/etag-hash/jest.config.js`
- [ ] `R100` `packages/etag-hash/src/index.ts` → `streaming/etag-hash/src/index.ts`
- [ ] `R100` `packages/etag-hash/tsconfig.esm.json` → `streaming/etag-hash/tsconfig.esm.json`
- [ ] `R100` `packages/etag-hash/tsconfig.json` → `streaming/etag-hash/tsconfig.json`

</details>

## Renamed / moved (with content changes) (1)
- [ ] `R094` `packages/etag-hash/package.json` → `streaming/etag-hash/package.json` (`+2/-2`) — diff: [R094_feed9979aefd.md](../diffs/R094_feed9979aefd.md)

## Grep checks
- [ ] `rg -n 'LaunchQL|launchql' streaming/etag-hash`
- [ ] `rg -n '@launchql/' streaming/etag-hash`
