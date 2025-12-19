# Review checklist — `packages/uuid-stream`

## Context
- Compare: `main...HEAD` (merge base `86d74dc4fce9051df0d2b5bcc163607aba42f009`)
- Branch: `refactor/ensure-new-name-mappings`
- Folder move: `packages/uuid-stream` → `streaming/uuid-stream`

## How to read linked diffs
- Module entries link to `review-checklists/diffs/*.md` with side-by-side output (`diff -y`).
- Left = `main`, Right = `HEAD`
- Legend: `|` changed, `<` only in `main`, `>` only in `HEAD`

## Package.json checks
- [ ] `name` unchanged: `uuid-stream`

## Renamed / moved (no content changes) (8)
<details>
<summary>Show 8 rename-only paths</summary>

- [ ] `R100` `packages/uuid-stream/CHANGELOG.md` → `streaming/uuid-stream/CHANGELOG.md`
- [ ] `R100` `packages/uuid-stream/README.md` → `streaming/uuid-stream/README.md`
- [ ] `R100` `packages/uuid-stream/__tests__/__snapshots__/uuid-stream.test.ts.snap` → `streaming/uuid-stream/__tests__/__snapshots__/uuid-stream.test.ts.snap`
- [ ] `R100` `packages/uuid-stream/__tests__/uuid-stream.test.ts` → `streaming/uuid-stream/__tests__/uuid-stream.test.ts`
- [ ] `R100` `packages/uuid-stream/jest.config.js` → `streaming/uuid-stream/jest.config.js`
- [ ] `R100` `packages/uuid-stream/src/index.ts` → `streaming/uuid-stream/src/index.ts`
- [ ] `R100` `packages/uuid-stream/tsconfig.esm.json` → `streaming/uuid-stream/tsconfig.esm.json`
- [ ] `R100` `packages/uuid-stream/tsconfig.json` → `streaming/uuid-stream/tsconfig.json`

</details>

## Renamed / moved (with content changes) (1)
- [ ] `R096` `packages/uuid-stream/package.json` → `streaming/uuid-stream/package.json` (`+1/-1`) — diff: [R096_f0223b25905c.md](../diffs/R096_f0223b25905c.md)

## Grep checks
- [ ] `rg -n 'LaunchQL|launchql' streaming/uuid-stream`
- [ ] `rg -n '@launchql/' streaming/uuid-stream`
