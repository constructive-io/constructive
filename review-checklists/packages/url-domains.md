# Review checklist — `packages/url-domains`

## Context
- Compare: `main...HEAD` (merge base `86d74dc4fce9051df0d2b5bcc163607aba42f009`)
- Branch: `refactor/ensure-new-name-mappings`

## How to review
- Content changes link to per-file diff docs under `review-checklists/diffs/`
- Each diff doc includes Prev/Next navigation

## Package.json checks
- [ ] `name`: `@launchql/url-domains` → `@constructive-io/url-domains`

## Modified (content changes) (3)
- [ ] `M` `packages/url-domains/CHANGELOG.md` (`+2/-2`) — diff: [M_6da6f6fe06ba.md](../diffs/M_6da6f6fe06ba.md)
- [ ] `M` `packages/url-domains/README.md` (`+5/-5`) — diff: [M_291c85613d19.md](../diffs/M_291c85613d19.md)
- [ ] `M` `packages/url-domains/package.json` (`+2/-2`) — diff: [M_e951cdb42f97.md](../diffs/M_e951cdb42f97.md)

## Grep checks
- [ ] `rg -n 'LaunchQL|launchql' packages/url-domains`
- [ ] `rg -n '@launchql/' packages/url-domains`
