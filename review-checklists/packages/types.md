# Review checklist — `packages/types`

## Context
- Compare: `main...HEAD` (merge base `86d74dc4fce9051df0d2b5bcc163607aba42f009`)
- Branch: `refactor/ensure-new-name-mappings`
- Folder move: `packages/types` → `pgpm/types`

## How to review
- Content changes link to per-file diff docs under `review-checklists/diffs/`
- Each diff doc includes Prev/Next navigation

## Package.json checks
- [ ] `name` unchanged: `@pgpmjs/types`

## Renamed / moved (no content changes) (10)
<details>
<summary>Show 10 rename-only paths</summary>

- [ ] `R100` `packages/types/CHANGELOG.md` → `pgpm/types/CHANGELOG.md`
- [ ] `R100` `packages/types/README.md` → `pgpm/types/README.md`
- [ ] `R100` `packages/types/jest.config.js` → `pgpm/types/jest.config.js`
- [ ] `R100` `packages/types/src/error-factory.ts` → `pgpm/types/src/error-factory.ts`
- [ ] `R100` `packages/types/src/error.ts` → `pgpm/types/src/error.ts`
- [ ] `R100` `packages/types/src/index.ts` → `pgpm/types/src/index.ts`
- [ ] `R100` `packages/types/src/jobs.ts` → `pgpm/types/src/jobs.ts`
- [ ] `R100` `packages/types/src/update.ts` → `pgpm/types/src/update.ts`
- [ ] `R100` `packages/types/tsconfig.esm.json` → `pgpm/types/tsconfig.esm.json`
- [ ] `R100` `packages/types/tsconfig.json` → `pgpm/types/tsconfig.json`

</details>

## Renamed / moved (with content changes) (2)
- [ ] `R096` `packages/types/package.json` → `pgpm/types/package.json` (`+1/-1`) — diff: [R096_663498555cc0.md](../diffs/R096_663498555cc0.md)
- [ ] `R099` `packages/types/src/pgpm.ts` → `pgpm/types/src/pgpm.ts` (`+1/-1`) — diff: [R099_991fbbba7e4b.md](../diffs/R099_991fbbba7e4b.md)

## Grep checks
- [ ] `rg -n 'LaunchQL|launchql' pgpm/types`
- [ ] `rg -n '@launchql/' pgpm/types`
