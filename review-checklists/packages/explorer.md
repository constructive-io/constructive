# Review checklist — `packages/explorer`

## Context
- Compare: `main...HEAD` (merge base `86d74dc4fce9051df0d2b5bcc163607aba42f009`)
- Branch: `refactor/ensure-new-name-mappings`
- Folder move: `packages/explorer` → `graphql/explorer`

## How to read linked diffs
- Module entries link to `review-checklists/diffs/*.md` with side-by-side output (`diff -y`).
- Left = `main`, Right = `HEAD`
- Legend: `|` changed, `<` only in `main`, `>` only in `HEAD`

## Package.json checks
- [ ] `name`: `@launchql/explorer` → `@constructive-io/graphql-explorer`
- [ ] `description` updated
- [ ] `keywords` updated
- [ ] `dependencies` updated

## Renamed / moved (no content changes) (5)
<details>
<summary>Show 5 rename-only paths</summary>

- [ ] `R100` `packages/explorer/jest.config.js` → `graphql/explorer/jest.config.js`
- [ ] `R100` `packages/explorer/src/index.ts` → `graphql/explorer/src/index.ts`
- [ ] `R100` `packages/explorer/src/render.ts` → `graphql/explorer/src/render.ts`
- [ ] `R100` `packages/explorer/tsconfig.esm.json` → `graphql/explorer/tsconfig.esm.json`
- [ ] `R100` `packages/explorer/tsconfig.json` → `graphql/explorer/tsconfig.json`

</details>

## Renamed / moved (with content changes) (5)
- [ ] `R069` `packages/explorer/README.md` → `graphql/explorer/README.md` (`+2/-2`) — diff: [R069_5c3ddceda0f3.md](../diffs/R069_5c3ddceda0f3.md)
- [ ] `R078` `packages/explorer/package.json` → `graphql/explorer/package.json` (`+9/-9`) — diff: [R078_e10cca62505b.md](../diffs/R078_e10cca62505b.md)
- [ ] `R095` `packages/explorer/src/resolvers/uploads.ts` → `graphql/explorer/src/resolvers/uploads.ts` (`+2/-2`) — diff: [R095_64e65eb7c07d.md](../diffs/R095_64e65eb7c07d.md)
- [ ] `R095` `packages/explorer/src/server.ts` → `graphql/explorer/src/server.ts` (`+4/-4`) — diff: [R095_c46cad7fc01c.md](../diffs/R095_c46cad7fc01c.md)
- [ ] `R061` `packages/explorer/src/settings.ts` → `graphql/explorer/src/settings.ts` (`+3/-3`) — diff: [R061_b0e8618b91c9.md](../diffs/R061_b0e8618b91c9.md)

## Added (2)
- [ ] `A` `graphql/explorer/CHANGELOG.md` — content: [A_db7abb4f0f04.md](../diffs/A_db7abb4f0f04.md)
- [ ] `A` `graphql/explorer/src/run.ts` — content: [A_e227925f9dc2.md](../diffs/A_e227925f9dc2.md)

## Deleted (2)
- [ ] `D` `packages/explorer/CHANGELOG.md` — content: [D_b7b35fd891de.md](../diffs/D_b7b35fd891de.md)
- [ ] `D` `packages/explorer/src/run.ts` — content: [D_f75797938177.md](../diffs/D_f75797938177.md)

## Grep checks
- [ ] `rg -n 'LaunchQL|launchql' graphql/explorer`
- [ ] `rg -n '@launchql/' graphql/explorer`
