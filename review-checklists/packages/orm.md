# Review checklist — `packages/orm`

## Context
- Compare: `main...HEAD` (merge base `86d74dc4fce9051df0d2b5bcc163607aba42f009`)
- Branch: `refactor/ensure-new-name-mappings`

## How to read linked diffs
- Module entries link to `review-checklists/diffs/*.md` with side-by-side output (`diff -y`).
- Left = `main`, Right = `HEAD`
- Legend: `|` changed, `<` only in `main`, `>` only in `HEAD`

## Package.json checks
- [ ] `name`: `@pgpmjs/orm` → `@constructive-io/orm`

## Modified (content changes) (3)
- [ ] `M` `packages/orm/CHANGELOG.md` (`+2/-2`) — diff: [M_a252d6303c3e.md](../diffs/M_a252d6303c3e.md)
- [ ] `M` `packages/orm/README.md` (`+2/-2`) — diff: [M_b881c713b1bc.md](../diffs/M_b881c713b1bc.md)
- [ ] `M` `packages/orm/package.json` (`+2/-2`) — diff: [M_cd9b9a862982.md](../diffs/M_cd9b9a862982.md)

## Grep checks
- [ ] `rg -n 'LaunchQL|launchql' packages/orm`
- [ ] `rg -n '@launchql/' packages/orm`
