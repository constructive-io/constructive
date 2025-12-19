# Review checklist — `packages/client`

## Context
- Compare: `main...HEAD` (merge base `86d74dc4fce9051df0d2b5bcc163607aba42f009`)
- Branch: `refactor/ensure-new-name-mappings`

## How to review
- Content changes link to per-file diff docs under `review-checklists/diffs/`
- Each diff doc includes Prev/Next navigation

## Package.json checks
- [ ] `name`: `@pgpmjs/client` → `@constructive-io/client`

## Modified (content changes) (3)
- [ ] `M` `packages/client/CHANGELOG.md` (`+2/-2`) — diff: [M_d0795c369d8d.md](../diffs/M_d0795c369d8d.md)
- [ ] `M` `packages/client/README.md` (`+2/-2`) — diff: [M_89fdd7e04261.md](../diffs/M_89fdd7e04261.md)
- [ ] `M` `packages/client/package.json` (`+2/-2`) — diff: [M_4edf2ab12b1b.md](../diffs/M_4edf2ab12b1b.md)

## Grep checks
- [ ] `rg -n 'LaunchQL|launchql' packages/client`
- [ ] `rg -n '@launchql/' packages/client`
