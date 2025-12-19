# Review checklist — `packages/content-type-stream`

## Context
- Compare: `main...HEAD` (merge base `86d74dc4fce9051df0d2b5bcc163607aba42f009`)
- Branch: `refactor/ensure-new-name-mappings`
- Folder move: `packages/content-type-stream` → `streaming/content-type-stream`

## How to read linked diffs
- Module entries link to `review-checklists/diffs/*.md` with side-by-side output (`diff -y`).
- Left = `main`, Right = `HEAD`
- Legend: `|` changed, `<` only in `main`, `>` only in `HEAD`

## Package.json checks
- [ ] `name`: `@launchql/content-type-stream` → `@constructive-io/content-type-stream`

## Renamed / moved (no content changes) (8)
<details>
<summary>Show 8 rename-only paths</summary>

- [ ] `R100` `packages/content-type-stream/__tests__/__snapshots__/mimetypes.test.ts.snap` → `streaming/content-type-stream/__tests__/__snapshots__/mimetypes.test.ts.snap`
- [ ] `R100` `packages/content-type-stream/__tests__/mimetypes.test.ts` → `streaming/content-type-stream/__tests__/mimetypes.test.ts`
- [ ] `R100` `packages/content-type-stream/jest.config.js` → `streaming/content-type-stream/jest.config.js`
- [ ] `R100` `packages/content-type-stream/src/content-stream.ts` → `streaming/content-type-stream/src/content-stream.ts`
- [ ] `R100` `packages/content-type-stream/src/content-type-stream.ts` → `streaming/content-type-stream/src/content-type-stream.ts`
- [ ] `R100` `packages/content-type-stream/src/index.ts` → `streaming/content-type-stream/src/index.ts`
- [ ] `R100` `packages/content-type-stream/tsconfig.esm.json` → `streaming/content-type-stream/tsconfig.esm.json`
- [ ] `R100` `packages/content-type-stream/tsconfig.json` → `streaming/content-type-stream/tsconfig.json`

</details>

## Renamed / moved (with content changes) (3)
- [ ] `R056` `packages/content-type-stream/CHANGELOG.md` → `streaming/content-type-stream/CHANGELOG.md` (`+2/-2`) — diff: [R056_3c106625db29.md](../diffs/R056_3c106625db29.md)
- [ ] `R085` `packages/content-type-stream/README.md` → `streaming/content-type-stream/README.md` (`+3/-3`) — diff: [R085_83c3b6c5b8f7.md](../diffs/R085_83c3b6c5b8f7.md)
- [ ] `R092` `packages/content-type-stream/package.json` → `streaming/content-type-stream/package.json` (`+2/-2`) — diff: [R092_0b696d620e88.md](../diffs/R092_0b696d620e88.md)

## Grep checks
- [ ] `rg -n 'LaunchQL|launchql' streaming/content-type-stream`
- [ ] `rg -n '@launchql/' streaming/content-type-stream`
