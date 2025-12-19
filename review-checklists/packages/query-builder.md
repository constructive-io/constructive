# Review checklist — `packages/query-builder`

## Context
- Compare: `main...HEAD` (merge base `86d74dc4fce9051df0d2b5bcc163607aba42f009`)
- Branch: `refactor/ensure-new-name-mappings`

## How to read linked diffs
- Module entries link to `review-checklists/diffs/*.md` with side-by-side output (`diff -y`).
- Left = `main`, Right = `HEAD`
- Legend: `|` changed, `<` only in `main`, `>` only in `HEAD`

## Package.json checks
- [ ] `name`: `@launchql/query-builder` → `@constructive-io/query-builder`
- [ ] `keywords` updated

## Modified (content changes) (3)
- [ ] `M` `packages/query-builder/CHANGELOG.md` (`+2/-2`) — diff: [M_197b6d192937.md](../diffs/M_197b6d192937.md)
- [ ] `M` `packages/query-builder/README.md` (`+3/-3`) — diff: [M_15eb8b043a79.md](../diffs/M_15eb8b043a79.md)
- [ ] `M` `packages/query-builder/package.json` (`+3/-3`) — diff: [M_41475f3c989a.md](../diffs/M_41475f3c989a.md)

## Grep checks
- [ ] `rg -n 'LaunchQL|launchql' packages/query-builder`
- [ ] `rg -n '@launchql/' packages/query-builder`
