# Review checklist — `packages/server-utils`

## Context
- Compare: `main...HEAD` (merge base `86d74dc4fce9051df0d2b5bcc163607aba42f009`)
- Branch: `refactor/ensure-new-name-mappings`

## How to review
- Content changes link to per-file diff docs under `review-checklists/diffs/`
- Each diff doc includes Prev/Next navigation

## Package.json checks
- [ ] `name` unchanged: `@pgpmjs/server-utils`

## Modified (content changes) (2)
- [ ] `M` `packages/server-utils/README.md` (`+2/-2`) — diff: [M_3ee4848a32dc.md](../diffs/M_3ee4848a32dc.md)
- [ ] `M` `packages/server-utils/package.json` (`+1/-1`) — diff: [M_f0c4764564fc.md](../diffs/M_f0c4764564fc.md)

## Grep checks
- [ ] `rg -n 'LaunchQL|launchql' packages/server-utils`
- [ ] `rg -n '@launchql/' packages/server-utils`
