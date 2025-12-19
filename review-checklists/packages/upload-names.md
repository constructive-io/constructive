# Review checklist — `packages/upload-names`

## Context
- Compare: `main...HEAD` (merge base `86d74dc4fce9051df0d2b5bcc163607aba42f009`)
- Branch: `refactor/ensure-new-name-mappings`
- Folder move: `packages/upload-names` → `streaming/upload-names`

## How to read linked diffs
- Module entries link to `review-checklists/diffs/*.md` with side-by-side output (`diff -y`).
- Left = `main`, Right = `HEAD`
- Legend: `|` changed, `<` only in `main`, `>` only in `HEAD`

## Package.json checks
- [ ] `name`: `@launchql/upload-names` → `@constructive-io/upload-names`

## Renamed / moved (no content changes) (7)
<details>
<summary>Show 7 rename-only paths</summary>

- [ ] `R100` `packages/upload-names/__tests__/__snapshots__/names.test.ts.snap` → `streaming/upload-names/__tests__/__snapshots__/names.test.ts.snap`
- [ ] `R100` `packages/upload-names/__tests__/names.test.ts` → `streaming/upload-names/__tests__/names.test.ts`
- [ ] `R100` `packages/upload-names/jest.config.js` → `streaming/upload-names/jest.config.js`
- [ ] `R100` `packages/upload-names/src/index.ts` → `streaming/upload-names/src/index.ts`
- [ ] `R100` `packages/upload-names/src/slugify.ts` → `streaming/upload-names/src/slugify.ts`
- [ ] `R100` `packages/upload-names/tsconfig.esm.json` → `streaming/upload-names/tsconfig.esm.json`
- [ ] `R100` `packages/upload-names/tsconfig.json` → `streaming/upload-names/tsconfig.json`

</details>

## Renamed / moved (with content changes) (3)
- [ ] `R059` `packages/upload-names/CHANGELOG.md` → `streaming/upload-names/CHANGELOG.md` (`+2/-2`) — diff: [R059_6238f2287c4a.md](../diffs/R059_6238f2287c4a.md)
- [ ] `R079` `packages/upload-names/README.md` → `streaming/upload-names/README.md` (`+3/-3`) — diff: [R079_6c174a7c83f6.md](../diffs/R079_6c174a7c83f6.md)
- [ ] `R091` `packages/upload-names/package.json` → `streaming/upload-names/package.json` (`+2/-2`) — diff: [R091_2f2effd28520.md](../diffs/R091_2f2effd28520.md)

## Grep checks
- [ ] `rg -n 'LaunchQL|launchql' streaming/upload-names`
- [ ] `rg -n '@launchql/' streaming/upload-names`
