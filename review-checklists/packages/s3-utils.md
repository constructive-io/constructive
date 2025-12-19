# Review checklist — `packages/s3-utils`

## Context
- Compare: `main...HEAD` (merge base `86d74dc4fce9051df0d2b5bcc163607aba42f009`)
- Branch: `refactor/ensure-new-name-mappings`
- Folder move: `packages/s3-utils` → `streaming/s3-utils`

## How to review
- Content changes link to per-file diff docs under `review-checklists/diffs/`
- Each diff doc includes Prev/Next navigation

## Package.json checks
- [ ] `name`: `@launchql/s3-utils` → `@constructive-io/s3-utils`

## Renamed / moved (no content changes) (6)
<details>
<summary>Show 6 rename-only paths</summary>

- [ ] `R100` `packages/s3-utils/jest.config.js` → `streaming/s3-utils/jest.config.js`
- [ ] `R100` `packages/s3-utils/src/index.ts` → `streaming/s3-utils/src/index.ts`
- [ ] `R100` `packages/s3-utils/src/policies.ts` → `streaming/s3-utils/src/policies.ts`
- [ ] `R100` `packages/s3-utils/src/utils.ts` → `streaming/s3-utils/src/utils.ts`
- [ ] `R100` `packages/s3-utils/tsconfig.esm.json` → `streaming/s3-utils/tsconfig.esm.json`
- [ ] `R100` `packages/s3-utils/tsconfig.json` → `streaming/s3-utils/tsconfig.json`

</details>

## Renamed / moved (with content changes) (3)
- [ ] `R060` `packages/s3-utils/CHANGELOG.md` → `streaming/s3-utils/CHANGELOG.md` (`+2/-2`) — diff: [R060_90800a485c3b.md](../diffs/R060_90800a485c3b.md)
- [ ] `R073` `packages/s3-utils/README.md` → `streaming/s3-utils/README.md` (`+1/-1`) — diff: [R073_269d9319c34c.md](../diffs/R073_269d9319c34c.md)
- [ ] `R092` `packages/s3-utils/package.json` → `streaming/s3-utils/package.json` (`+2/-2`) — diff: [R092_49e89d415f6f.md](../diffs/R092_49e89d415f6f.md)

## Grep checks
- [ ] `rg -n 'LaunchQL|launchql' streaming/s3-utils`
- [ ] `rg -n '@launchql/' streaming/s3-utils`
