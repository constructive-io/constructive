# Review checklist — `packages/etag-stream`

## Context
- Compare: `main...HEAD` (merge base `86d74dc4fce9051df0d2b5bcc163607aba42f009`)
- Branch: `refactor/ensure-new-name-mappings`
- Folder move: `packages/etag-stream` → `streaming/etag-stream`

## How to review
- Content changes link to per-file diff docs under `review-checklists/diffs/`
- Each diff doc includes Prev/Next navigation

## Package.json checks
- [ ] `name` unchanged: `etag-stream`

## Renamed / moved (no content changes) (12)
<details>
<summary>Show 12 rename-only paths</summary>

- [ ] `R100` `packages/etag-stream/CHANGELOG.md` → `streaming/etag-stream/CHANGELOG.md`
- [ ] `R100` `packages/etag-stream/README.md` → `streaming/etag-stream/README.md`
- [ ] `R100` `packages/etag-stream/__fixtures__/deadman.jpg` → `streaming/etag-stream/__fixtures__/deadman.jpg`
- [ ] `R100` `packages/etag-stream/__fixtures__/pct.pct` → `streaming/etag-stream/__fixtures__/pct.pct`
- [ ] `R100` `packages/etag-stream/__fixtures__/pdf.pdf` → `streaming/etag-stream/__fixtures__/pdf.pdf`
- [ ] `R100` `packages/etag-stream/__fixtures__/scss.scss` → `streaming/etag-stream/__fixtures__/scss.scss`
- [ ] `R100` `packages/etag-stream/__tests__/__snapshots__/etag-stream.test.ts.snap` → `streaming/etag-stream/__tests__/__snapshots__/etag-stream.test.ts.snap`
- [ ] `R100` `packages/etag-stream/__tests__/etag-stream.test.ts` → `streaming/etag-stream/__tests__/etag-stream.test.ts`
- [ ] `R100` `packages/etag-stream/jest.config.js` → `streaming/etag-stream/jest.config.js`
- [ ] `R100` `packages/etag-stream/src/index.ts` → `streaming/etag-stream/src/index.ts`
- [ ] `R100` `packages/etag-stream/tsconfig.esm.json` → `streaming/etag-stream/tsconfig.esm.json`
- [ ] `R100` `packages/etag-stream/tsconfig.json` → `streaming/etag-stream/tsconfig.json`

</details>

## Renamed / moved (with content changes) (1)
- [ ] `R096` `packages/etag-stream/package.json` → `streaming/etag-stream/package.json` (`+1/-1`) — diff: [R096_68fb6d4c9df5.md](../diffs/R096_68fb6d4c9df5.md)

## Grep checks
- [ ] `rg -n 'LaunchQL|launchql' streaming/etag-stream`
- [ ] `rg -n '@launchql/' streaming/etag-stream`
