# Review checklist — `packages/stream-to-etag`

## Context
- Compare: `main...HEAD` (merge base `86d74dc4fce9051df0d2b5bcc163607aba42f009`)
- Branch: `refactor/ensure-new-name-mappings`
- Folder move: `packages/stream-to-etag` → `streaming/stream-to-etag`

## How to read linked diffs
- Module entries link to `review-checklists/diffs/*.md` with side-by-side output (`diff -y`).
- Left = `main`, Right = `HEAD`
- Legend: `|` changed, `<` only in `main`, `>` only in `HEAD`

## Package.json checks
- [ ] `name` unchanged: `stream-to-etag`

## Renamed / moved (no content changes) (12)
<details>
<summary>Show 12 rename-only paths</summary>

- [ ] `R100` `packages/stream-to-etag/CHANGELOG.md` → `streaming/stream-to-etag/CHANGELOG.md`
- [ ] `R100` `packages/stream-to-etag/README.md` → `streaming/stream-to-etag/README.md`
- [ ] `R100` `packages/stream-to-etag/__fixtures__/deadman.jpg` → `streaming/stream-to-etag/__fixtures__/deadman.jpg`
- [ ] `R100` `packages/stream-to-etag/__fixtures__/pct.pct` → `streaming/stream-to-etag/__fixtures__/pct.pct`
- [ ] `R100` `packages/stream-to-etag/__fixtures__/pdf.pdf` → `streaming/stream-to-etag/__fixtures__/pdf.pdf`
- [ ] `R100` `packages/stream-to-etag/__fixtures__/scss.scss` → `streaming/stream-to-etag/__fixtures__/scss.scss`
- [ ] `R100` `packages/stream-to-etag/__tests__/__snapshots__/stream-to-etag.test.ts.snap` → `streaming/stream-to-etag/__tests__/__snapshots__/stream-to-etag.test.ts.snap`
- [ ] `R100` `packages/stream-to-etag/__tests__/stream-to-etag.test.ts` → `streaming/stream-to-etag/__tests__/stream-to-etag.test.ts`
- [ ] `R100` `packages/stream-to-etag/jest.config.js` → `streaming/stream-to-etag/jest.config.js`
- [ ] `R100` `packages/stream-to-etag/src/index.ts` → `streaming/stream-to-etag/src/index.ts`
- [ ] `R100` `packages/stream-to-etag/tsconfig.esm.json` → `streaming/stream-to-etag/tsconfig.esm.json`
- [ ] `R100` `packages/stream-to-etag/tsconfig.json` → `streaming/stream-to-etag/tsconfig.json`

</details>

## Renamed / moved (with content changes) (1)
- [ ] `R096` `packages/stream-to-etag/package.json` → `streaming/stream-to-etag/package.json` (`+1/-1`) — diff: [R096_ba8d86b5768f.md](../diffs/R096_ba8d86b5768f.md)

## Grep checks
- [ ] `rg -n 'LaunchQL|launchql' streaming/stream-to-etag`
- [ ] `rg -n '@launchql/' streaming/stream-to-etag`
