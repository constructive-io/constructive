# Review checklist — `packages/launchql-env`

## Context
- Compare: `main...HEAD` (merge base `86d74dc4fce9051df0d2b5bcc163607aba42f009`)
- Branch: `refactor/ensure-new-name-mappings`
- Folder move: `packages/launchql-env` → `graphql/env`

## How to review
- Content changes link to per-file diff docs under `review-checklists/diffs/`
- Each diff doc includes Prev/Next navigation

## Package.json checks
- [ ] `name`: `@launchql/env` → `@constructive-io/graphql-env`
- [ ] `description` updated
- [ ] `keywords` updated
- [ ] `dependencies` updated

## Renamed / moved (no content changes) (2)
<details>
<summary>Show 2 rename-only paths</summary>

- [ ] `R100` `packages/launchql-env/tsconfig.esm.json` → `graphql/env/tsconfig.esm.json`
- [ ] `R100` `packages/launchql-env/tsconfig.json` → `graphql/env/tsconfig.json`

</details>

## Renamed / moved (with content changes) (4)
- [ ] `R078` `packages/launchql-env/README.md` → `graphql/env/README.md` (`+7/-7`) — diff: [R078_32b47e3ddf92.md](../diffs/R078_32b47e3ddf92.md)
- [ ] `R079` `packages/launchql-env/package.json` → `graphql/env/package.json` (`+5/-5`) — diff: [R079_dd36fac31aa0.md](../diffs/R079_dd36fac31aa0.md)
- [ ] `R088` `packages/launchql-env/src/env.ts` → `graphql/env/src/env.ts` (`+3/-3`) — diff: [R088_03da874f7c4f.md](../diffs/R088_03da874f7c4f.md)
- [ ] `R065` `packages/launchql-env/src/merge.ts` → `graphql/env/src/merge.ts` (`+12/-12`) — diff: [R065_56331366368e.md](../diffs/R065_56331366368e.md)

## Added (2)
- [ ] `A` `graphql/env/CHANGELOG.md` — content: [A_b0a86d1842da.md](../diffs/A_b0a86d1842da.md)
- [ ] `A` `graphql/env/src/index.ts` — content: [A_4ebd9c8a5326.md](../diffs/A_4ebd9c8a5326.md)

## Deleted (2)
- [ ] `D` `packages/launchql-env/CHANGELOG.md` — content: [D_af13df6a0be1.md](../diffs/D_af13df6a0be1.md)
- [ ] `D` `packages/launchql-env/src/index.ts` — content: [D_598799e6169a.md](../diffs/D_598799e6169a.md)

## Grep checks
- [ ] `rg -n 'LaunchQL|launchql' graphql/env`
- [ ] `rg -n '@launchql/' graphql/env`
