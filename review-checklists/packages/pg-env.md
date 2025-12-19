# Review checklist — `packages/pg-env`

## Context
- Compare: `main...HEAD` (merge base `86d74dc4fce9051df0d2b5bcc163607aba42f009`)
- Branch: `refactor/ensure-new-name-mappings`
- Folder move: `packages/pg-env` → `postgres/pg-env`

## How to read linked diffs
- Module entries link to `review-checklists/diffs/*.md` with side-by-side output (`diff -y`).
- Left = `main`, Right = `HEAD`
- Legend: `|` changed, `<` only in `main`, `>` only in `HEAD`

## Package.json checks
- [ ] `name` unchanged: `pg-env`
- [ ] `keywords` updated

## Renamed / moved (no content changes) (7)
<details>
<summary>Show 7 rename-only paths</summary>

- [ ] `R100` `packages/pg-env/CHANGELOG.md` → `postgres/pg-env/CHANGELOG.md`
- [ ] `R100` `packages/pg-env/README.md` → `postgres/pg-env/README.md`
- [ ] `R100` `packages/pg-env/src/env.ts` → `postgres/pg-env/src/env.ts`
- [ ] `R100` `packages/pg-env/src/index.ts` → `postgres/pg-env/src/index.ts`
- [ ] `R100` `packages/pg-env/src/pg-config.ts` → `postgres/pg-env/src/pg-config.ts`
- [ ] `R100` `packages/pg-env/tsconfig.esm.json` → `postgres/pg-env/tsconfig.esm.json`
- [ ] `R100` `packages/pg-env/tsconfig.json` → `postgres/pg-env/tsconfig.json`

</details>

## Renamed / moved (with content changes) (1)
- [ ] `R094` `packages/pg-env/package.json` → `postgres/pg-env/package.json` (`+2/-2`) — diff: [R094_a72a6ce17b17.md](../diffs/R094_a72a6ce17b17.md)

## Grep checks
- [ ] `rg -n 'LaunchQL|launchql' postgres/pg-env`
- [ ] `rg -n '@launchql/' postgres/pg-env`
