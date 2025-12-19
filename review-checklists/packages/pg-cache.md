# Review checklist — `packages/pg-cache`

## Context
- Compare: `main...HEAD` (merge base `86d74dc4fce9051df0d2b5bcc163607aba42f009`)
- Branch: `refactor/ensure-new-name-mappings`
- Folder move: `packages/pg-cache` → `postgres/pg-cache`

## How to read linked diffs
- Module entries link to `review-checklists/diffs/*.md` with side-by-side output (`diff -y`).
- Left = `main`, Right = `HEAD`
- Legend: `|` changed, `<` only in `main`, `>` only in `HEAD`

## Package.json checks
- [ ] `name` unchanged: `pg-cache`
- [ ] `keywords` updated

## Renamed / moved (no content changes) (7)
<details>
<summary>Show 7 rename-only paths</summary>

- [ ] `R100` `packages/pg-cache/CHANGELOG.md` → `postgres/pg-cache/CHANGELOG.md`
- [ ] `R100` `packages/pg-cache/jest.config.js` → `postgres/pg-cache/jest.config.js`
- [ ] `R100` `packages/pg-cache/src/index.ts` → `postgres/pg-cache/src/index.ts`
- [ ] `R100` `packages/pg-cache/src/lru.ts` → `postgres/pg-cache/src/lru.ts`
- [ ] `R100` `packages/pg-cache/src/pg.ts` → `postgres/pg-cache/src/pg.ts`
- [ ] `R100` `packages/pg-cache/tsconfig.esm.json` → `postgres/pg-cache/tsconfig.esm.json`
- [ ] `R100` `packages/pg-cache/tsconfig.json` → `postgres/pg-cache/tsconfig.json`

</details>

## Renamed / moved (with content changes) (2)
- [ ] `R088` `packages/pg-cache/README.md` → `postgres/pg-cache/README.md` (`+2/-3`) — diff: [R088_2e00c3815a63.md](../diffs/R088_2e00c3815a63.md)
- [ ] `R095` `packages/pg-cache/package.json` → `postgres/pg-cache/package.json` (`+2/-2`) — diff: [R095_57796bb5520d.md](../diffs/R095_57796bb5520d.md)

## Grep checks
- [ ] `rg -n 'LaunchQL|launchql' postgres/pg-cache`
- [ ] `rg -n '@launchql/' postgres/pg-cache`
