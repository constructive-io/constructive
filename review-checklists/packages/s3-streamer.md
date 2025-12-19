# Review checklist — `packages/s3-streamer`

## Context
- Compare: `main...HEAD` (merge base `86d74dc4fce9051df0d2b5bcc163607aba42f009`)
- Branch: `refactor/ensure-new-name-mappings`
- Folder move: `packages/s3-streamer` → `streaming/s3-streamer`

## How to read linked diffs
- Module entries link to `review-checklists/diffs/*.md` with side-by-side output (`diff -y`).
- Left = `main`, Right = `HEAD`
- Legend: `|` changed, `<` only in `main`, `>` only in `HEAD`

## Package.json checks
- [ ] `name`: `@launchql/s3-streamer` → `@constructive-io/s3-streamer`
- [ ] `keywords` updated
- [ ] `dependencies` updated
- [ ] `devDependencies` updated

## Renamed / moved (no content changes) (7)
<details>
<summary>Show 7 rename-only paths</summary>

- [ ] `R100` `packages/s3-streamer/__tests__/__snapshots__/uploads.test.ts.snap` → `streaming/s3-streamer/__tests__/__snapshots__/uploads.test.ts.snap`
- [ ] `R100` `packages/s3-streamer/jest.config.js` → `streaming/s3-streamer/jest.config.js`
- [ ] `R100` `packages/s3-streamer/src/index.ts` → `streaming/s3-streamer/src/index.ts`
- [ ] `R100` `packages/s3-streamer/src/s3.ts` → `streaming/s3-streamer/src/s3.ts`
- [ ] `R100` `packages/s3-streamer/src/streamer.ts` → `streaming/s3-streamer/src/streamer.ts`
- [ ] `R100` `packages/s3-streamer/tsconfig.esm.json` → `streaming/s3-streamer/tsconfig.esm.json`
- [ ] `R100` `packages/s3-streamer/tsconfig.json` → `streaming/s3-streamer/tsconfig.json`

</details>

## Renamed / moved (with content changes) (4)
- [ ] `R089` `packages/s3-streamer/README.md` → `streaming/s3-streamer/README.md` (`+7/-7`) — diff: [R089_b512ce0fd366.md](../diffs/R089_b512ce0fd366.md)
- [ ] `R096` `packages/s3-streamer/__tests__/uploads.test.ts` → `streaming/s3-streamer/__tests__/uploads.test.ts` (`+2/-2`) — diff: [R096_53337b968474.md](../diffs/R096_53337b968474.md)
- [ ] `R084` `packages/s3-streamer/package.json` → `streaming/s3-streamer/package.json` (`+5/-5`) — diff: [R084_6c5529e4a937.md](../diffs/R084_6c5529e4a937.md)
- [ ] `R097` `packages/s3-streamer/src/utils.ts` → `streaming/s3-streamer/src/utils.ts` (`+1/-1`) — diff: [R097_0f2b89a0da93.md](../diffs/R097_0f2b89a0da93.md)

## Added (1)
- [ ] `A` `streaming/s3-streamer/CHANGELOG.md` — content: [A_80f80d8775bf.md](../diffs/A_80f80d8775bf.md)

## Deleted (1)
- [ ] `D` `packages/s3-streamer/CHANGELOG.md` — content: [D_3be8b3cd7689.md](../diffs/D_3be8b3cd7689.md)

## Grep checks
- [ ] `rg -n 'LaunchQL|launchql' streaming/s3-streamer`
- [ ] `rg -n '@launchql/' streaming/s3-streamer`
