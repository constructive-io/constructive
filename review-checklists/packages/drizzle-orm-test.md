# Review checklist — `packages/drizzle-orm-test`

## Context
- Compare: `main...HEAD` (merge base `86d74dc4fce9051df0d2b5bcc163607aba42f009`)
- Branch: `refactor/ensure-new-name-mappings`
- Folder move: `packages/drizzle-orm-test` → `postgres/drizzle-orm-test`

## How to review
- Content changes link to per-file diff docs under `review-checklists/diffs/`
- Each diff doc includes Prev/Next navigation

## Package.json checks
- [ ] `name` unchanged: `drizzle-orm-test`

## Renamed / moved (no content changes) (9)
<details>
<summary>Show 9 rename-only paths</summary>

- [ ] `R100` `packages/drizzle-orm-test/CHANGELOG.md` → `postgres/drizzle-orm-test/CHANGELOG.md`
- [ ] `R100` `packages/drizzle-orm-test/__tests__/drizzle-proxy.test.ts` → `postgres/drizzle-orm-test/__tests__/drizzle-proxy.test.ts`
- [ ] `R100` `packages/drizzle-orm-test/__tests__/drizzle-seed.test.ts` → `postgres/drizzle-orm-test/__tests__/drizzle-seed.test.ts`
- [ ] `R100` `packages/drizzle-orm-test/jest.config.js` → `postgres/drizzle-orm-test/jest.config.js`
- [ ] `R100` `packages/drizzle-orm-test/src/index.ts` → `postgres/drizzle-orm-test/src/index.ts`
- [ ] `R100` `packages/drizzle-orm-test/src/proxy-client.ts` → `postgres/drizzle-orm-test/src/proxy-client.ts`
- [ ] `R100` `packages/drizzle-orm-test/src/utils.ts` → `postgres/drizzle-orm-test/src/utils.ts`
- [ ] `R100` `packages/drizzle-orm-test/tsconfig.esm.json` → `postgres/drizzle-orm-test/tsconfig.esm.json`
- [ ] `R100` `packages/drizzle-orm-test/tsconfig.json` → `postgres/drizzle-orm-test/tsconfig.json`

</details>

## Renamed / moved (with content changes) (2)
- [ ] `R099` `packages/drizzle-orm-test/README.md` → `postgres/drizzle-orm-test/README.md` (`+1/-1`) — diff: [R099_fcdd616f0a58.md](../diffs/R099_fcdd616f0a58.md)
- [ ] `R097` `packages/drizzle-orm-test/package.json` → `postgres/drizzle-orm-test/package.json` (`+1/-1`) — diff: [R097_7362e12ab254.md](../diffs/R097_7362e12ab254.md)

## Grep checks
- [ ] `rg -n 'LaunchQL|launchql' postgres/drizzle-orm-test`
- [ ] `rg -n '@launchql/' postgres/drizzle-orm-test`
