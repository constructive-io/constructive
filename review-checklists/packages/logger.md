# Review checklist — `packages/logger`

## Context
- Compare: `main...HEAD` (merge base `86d74dc4fce9051df0d2b5bcc163607aba42f009`)
- Branch: `refactor/ensure-new-name-mappings`
- Folder move: `packages/logger` → `pgpm/logger`

## How to review
- Content changes link to per-file diff docs under `review-checklists/diffs/`
- Each diff doc includes Prev/Next navigation

## Package.json checks
- [ ] `name` unchanged: `@pgpmjs/logger`

## Renamed / moved (no content changes) (7)
<details>
<summary>Show 7 rename-only paths</summary>

- [ ] `R100` `packages/logger/CHANGELOG.md` → `pgpm/logger/CHANGELOG.md`
- [ ] `R100` `packages/logger/README.md` → `pgpm/logger/README.md`
- [ ] `R100` `packages/logger/jest.config.js` → `pgpm/logger/jest.config.js`
- [ ] `R100` `packages/logger/src/index.ts` → `pgpm/logger/src/index.ts`
- [ ] `R100` `packages/logger/src/logger.ts` → `pgpm/logger/src/logger.ts`
- [ ] `R100` `packages/logger/tsconfig.esm.json` → `pgpm/logger/tsconfig.esm.json`
- [ ] `R100` `packages/logger/tsconfig.json` → `pgpm/logger/tsconfig.json`

</details>

## Renamed / moved (with content changes) (1)
- [ ] `R096` `packages/logger/package.json` → `pgpm/logger/package.json` (`+1/-1`) — diff: [R096_a477bcc385ad.md](../diffs/R096_a477bcc385ad.md)

## Grep checks
- [ ] `rg -n 'LaunchQL|launchql' pgpm/logger`
- [ ] `rg -n '@launchql/' pgpm/logger`
