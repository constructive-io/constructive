# Review checklist — `packages/mime-bytes`

## Context
- Compare: `main...HEAD` (merge base `86d74dc4fce9051df0d2b5bcc163607aba42f009`)
- Branch: `refactor/ensure-new-name-mappings`
- Folder move: `packages/mime-bytes` → `streaming/mime-bytes`

## How to read linked diffs
- Module entries link to `review-checklists/diffs/*.md` with side-by-side output (`diff -y`).
- Left = `main`, Right = `HEAD`
- Legend: `|` changed, `<` only in `main`, `>` only in `HEAD`

## Package.json checks
- [ ] `name` unchanged: `mime-bytes`

## Renamed / moved (no content changes) (23)
<details>
<summary>Show 23 rename-only paths</summary>

- [ ] `R100` `packages/mime-bytes/CHANGELOG.md` → `streaming/mime-bytes/CHANGELOG.md`
- [ ] `R100` `packages/mime-bytes/README.md` → `streaming/mime-bytes/README.md`
- [ ] `R100` `packages/mime-bytes/__tests__/cad-file-detection.test.ts` → `streaming/mime-bytes/__tests__/cad-file-detection.test.ts`
- [ ] `R100` `packages/mime-bytes/__tests__/charset-content-type.test.ts` → `streaming/mime-bytes/__tests__/charset-content-type.test.ts`
- [ ] `R100` `packages/mime-bytes/__tests__/file-type-detector.test.ts` → `streaming/mime-bytes/__tests__/file-type-detector.test.ts`
- [ ] `R100` `packages/mime-bytes/__tests__/fixtures/__snapshots__/kitchen-sink.test.ts.snap` → `streaming/mime-bytes/__tests__/fixtures/__snapshots__/kitchen-sink.test.ts.snap`
- [ ] `R100` `packages/mime-bytes/__tests__/fixtures/__snapshots__/malicious.test.ts.snap` → `streaming/mime-bytes/__tests__/fixtures/__snapshots__/malicious.test.ts.snap`
- [ ] `R100` `packages/mime-bytes/__tests__/fixtures/kitchen-sink.test.ts` → `streaming/mime-bytes/__tests__/fixtures/kitchen-sink.test.ts`
- [ ] `R100` `packages/mime-bytes/__tests__/fixtures/malicious.test.ts` → `streaming/mime-bytes/__tests__/fixtures/malicious.test.ts`
- [ ] `R100` `packages/mime-bytes/__tests__/integration/typescript-detection.test.ts` → `streaming/mime-bytes/__tests__/integration/typescript-detection.test.ts`
- [ ] `R100` `packages/mime-bytes/examples/basic-usage.ts` → `streaming/mime-bytes/examples/basic-usage.ts`
- [ ] `R100` `packages/mime-bytes/examples/test-real-file.ts` → `streaming/mime-bytes/examples/test-real-file.ts`
- [ ] `R100` `packages/mime-bytes/examples/usage.ts` → `streaming/mime-bytes/examples/usage.ts`
- [ ] `R100` `packages/mime-bytes/jest.config.js` → `streaming/mime-bytes/jest.config.js`
- [ ] `R100` `packages/mime-bytes/src/file-type-detector.ts` → `streaming/mime-bytes/src/file-type-detector.ts`
- [ ] `R100` `packages/mime-bytes/src/file-types-registry.ts` → `streaming/mime-bytes/src/file-types-registry.ts`
- [ ] `R100` `packages/mime-bytes/src/index.ts` → `streaming/mime-bytes/src/index.ts`
- [ ] `R100` `packages/mime-bytes/src/peak.ts` → `streaming/mime-bytes/src/peak.ts`
- [ ] `R100` `packages/mime-bytes/src/utils/extensions.ts` → `streaming/mime-bytes/src/utils/extensions.ts`
- [ ] `R100` `packages/mime-bytes/src/utils/magic-bytes.ts` → `streaming/mime-bytes/src/utils/magic-bytes.ts`
- [ ] `R100` `packages/mime-bytes/src/utils/mime-types.ts` → `streaming/mime-bytes/src/utils/mime-types.ts`
- [ ] `R100` `packages/mime-bytes/tsconfig.esm.json` → `streaming/mime-bytes/tsconfig.esm.json`
- [ ] `R100` `packages/mime-bytes/tsconfig.json` → `streaming/mime-bytes/tsconfig.json`

</details>

## Renamed / moved (with content changes) (1)
- [ ] `R096` `packages/mime-bytes/package.json` → `streaming/mime-bytes/package.json` (`+1/-1`) — diff: [R096_b68c1b05d5cb.md](../diffs/R096_b68c1b05d5cb.md)

## Grep checks
- [ ] `rg -n 'LaunchQL|launchql' streaming/mime-bytes`
- [ ] `rg -n '@launchql/' streaming/mime-bytes`
