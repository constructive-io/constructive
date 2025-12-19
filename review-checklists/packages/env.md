# Review checklist — `packages/env`

## Context
- Compare: `main...HEAD` (merge base `86d74dc4fce9051df0d2b5bcc163607aba42f009`)
- Branch: `refactor/ensure-new-name-mappings`
- Folder move: `packages/env` → `pgpm/env`

## How to read linked diffs
- Module entries link to `review-checklists/diffs/*.md` with side-by-side output (`diff -y`).
- Left = `main`, Right = `HEAD`
- Legend: `|` changed, `<` only in `main`, `>` only in `HEAD`

## Package.json checks
- [ ] `name` unchanged: `@pgpmjs/env`

## Renamed / moved (no content changes) (6)
<details>
<summary>Show 6 rename-only paths</summary>

- [ ] `R100` `packages/env/CHANGELOG.md` → `pgpm/env/CHANGELOG.md`
- [ ] `R100` `packages/env/src/config.ts` → `pgpm/env/src/config.ts`
- [ ] `R100` `packages/env/src/index.ts` → `pgpm/env/src/index.ts`
- [ ] `R100` `packages/env/src/utils.ts` → `pgpm/env/src/utils.ts`
- [ ] `R100` `packages/env/tsconfig.esm.json` → `pgpm/env/tsconfig.esm.json`
- [ ] `R100` `packages/env/tsconfig.json` → `pgpm/env/tsconfig.json`

</details>

## Renamed / moved (with content changes) (4)
- [ ] `R055` `packages/env/README.md` → `pgpm/env/README.md` (`+3/-3`) — diff: [R055_a2bfefae5cd1.md](../diffs/R055_a2bfefae5cd1.md)
- [ ] `R096` `packages/env/package.json` → `pgpm/env/package.json` (`+1/-1`) — diff: [R096_66aeb2f0b559.md](../diffs/R096_66aeb2f0b559.md)
- [ ] `R099` `packages/env/src/env.ts` → `pgpm/env/src/env.ts` (`+1/-1`) — diff: [R099_9c972c4d7dab.md](../diffs/R099_9c972c4d7dab.md)
- [ ] `R091` `packages/env/src/merge.ts` → `pgpm/env/src/merge.ts` (`+1/-1`) — diff: [R091_b7fb16b0810e.md](../diffs/R091_b7fb16b0810e.md)

## Grep checks
- [ ] `rg -n 'LaunchQL|launchql' pgpm/env`
- [ ] `rg -n '@launchql/' pgpm/env`
