# Review checklist — `packages/supabase-test`

## Context
- Compare: `main...HEAD` (merge base `86d74dc4fce9051df0d2b5bcc163607aba42f009`)
- Branch: `refactor/ensure-new-name-mappings`
- Folder move: `packages/supabase-test` → `postgres/supabase-test`

## How to review
- Content changes link to per-file diff docs under `review-checklists/diffs/`
- Each diff doc includes Prev/Next navigation

## Package.json checks
- [ ] `name` unchanged: `supabase-test`

## Renamed / moved (no content changes) (8)
<details>
<summary>Show 8 rename-only paths</summary>

- [ ] `R100` `packages/supabase-test/CHANGELOG.md` → `postgres/supabase-test/CHANGELOG.md`
- [ ] `R100` `packages/supabase-test/jest.config.js` → `postgres/supabase-test/jest.config.js`
- [ ] `R100` `packages/supabase-test/src/connect.ts` → `postgres/supabase-test/src/connect.ts`
- [ ] `R100` `packages/supabase-test/src/helpers.ts` → `postgres/supabase-test/src/helpers.ts`
- [ ] `R100` `packages/supabase-test/src/index.ts` → `postgres/supabase-test/src/index.ts`
- [ ] `R100` `packages/supabase-test/src/utils.ts` → `postgres/supabase-test/src/utils.ts`
- [ ] `R100` `packages/supabase-test/tsconfig.esm.json` → `postgres/supabase-test/tsconfig.esm.json`
- [ ] `R100` `packages/supabase-test/tsconfig.json` → `postgres/supabase-test/tsconfig.json`

</details>

## Renamed / moved (with content changes) (2)
- [ ] `R099` `packages/supabase-test/README.md` → `postgres/supabase-test/README.md` (`+1/-1`) — diff: [R099_5dab79b18eeb.md](../diffs/R099_5dab79b18eeb.md)
- [ ] `R097` `packages/supabase-test/package.json` → `postgres/supabase-test/package.json` (`+1/-1`) — diff: [R097_1d2f849d089f.md](../diffs/R097_1d2f849d089f.md)

## Grep checks
- [ ] `rg -n 'LaunchQL|launchql' postgres/supabase-test`
- [ ] `rg -n '@launchql/' postgres/supabase-test`
