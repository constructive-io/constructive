# Review checklist — `packages/launchql-types`

## Context
- Compare: `main...HEAD` (merge base `86d74dc4fce9051df0d2b5bcc163607aba42f009`)
- Branch: `refactor/ensure-new-name-mappings`
- Folder move: `packages/launchql-types` → `graphql/types`

## How to review
- Content changes link to per-file diff docs under `review-checklists/diffs/`
- Each diff doc includes Prev/Next navigation

## Package.json checks
- [ ] `name`: `@launchql/types` → `@constructive-io/graphql-types`
- [ ] `description` updated
- [ ] `keywords` updated

## Renamed / moved (no content changes) (2)
<details>
<summary>Show 2 rename-only paths</summary>

- [ ] `R100` `packages/launchql-types/tsconfig.esm.json` → `graphql/types/tsconfig.esm.json`
- [ ] `R100` `packages/launchql-types/tsconfig.json` → `graphql/types/tsconfig.json`

</details>

## Renamed / moved (with content changes) (5)
- [ ] `R055` `packages/launchql-types/README.md` → `graphql/types/README.md` (`+12/-12`) — diff: [R055_64f01f4b0cc5.md](../diffs/R055_64f01f4b0cc5.md)
- [ ] `R084` `packages/launchql-types/package.json` → `graphql/types/package.json` (`+4/-4`) — diff: [R084_6377021ed1a6.md](../diffs/R084_6377021ed1a6.md)
- [ ] `R076` `packages/launchql-types/src/launchql.ts` → `graphql/types/src/constructive.ts` (`+9/-9`) — diff: [R076_9b4be5605096.md](../diffs/R076_9b4be5605096.md)
- [ ] `R097` `packages/launchql-types/src/graphile.ts` → `graphql/types/src/graphile.ts` (`+1/-1`) — diff: [R097_128291bdf9c8.md](../diffs/R097_128291bdf9c8.md)
- [ ] `R063` `packages/launchql-types/src/index.ts` → `graphql/types/src/index.ts` (`+6/-6`) — diff: [R063_35a85538178a.md](../diffs/R063_35a85538178a.md)

## Added (1)
- [ ] `A` `graphql/types/CHANGELOG.md` — content: [A_e5a4a6b7b731.md](../diffs/A_e5a4a6b7b731.md)

## Deleted (1)
- [ ] `D` `packages/launchql-types/CHANGELOG.md` — content: [D_4e2e9830bbf6.md](../diffs/D_4e2e9830bbf6.md)

## Grep checks
- [ ] `rg -n 'LaunchQL|launchql' graphql/types`
- [ ] `rg -n '@launchql/' graphql/types`
