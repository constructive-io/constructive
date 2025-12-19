# Diff — `M` `graphile/graphile-settings/package.json`

## Navigation
- Prev: [M_9333927dfd80.md](M_9333927dfd80.md) | Up: [graphile.md](../graphile.md) | Index: [README.md](../README.md) | Diffs: [diffs/README.md](README.md) | Snapshots: [SNAPSHOTS.md](../SNAPSHOTS.md) | Next: [M_d74c9b052a37.md](M_d74c9b052a37.md)

## Context
- Diff base (merge base for `main...HEAD`): `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Main tip: `2492d840ab18e5c30cc7a24a7b4959abf5d6b21e`
- Head: `refactor/ensure-new-name-mappings` @ `27ba20cfc1e66cb921f229963ca63a201fcf6952`
- Module: `graphile`
- Numstat: `+4/-4`
- Reproduce: `git diff main...HEAD -- graphile/graphile-settings/package.json`

## Changes (line-aligned)
- `    "test": "jest --passWithNoTests",`
  - `` → `--passWithNoTests`
- `    "@constructive-io/graphql-env": "workspace:^",`
  - `launchql` → `constructive-io`
  - `` → `graphql-`
- `    "@constructive-io/graphql-types": "workspace:^",`
  - `launchql` → `constructive-io`
  - `` → `graphql-`
- `    "constructive",`
  - `launchql` → `constructive`

## Full diff (side-by-side, changed lines only)
<details>
<summary>Show</summary>

- Left = diff base, Right = `HEAD`
- Legend: `|` changed, `<` only in base, `>` only in `HEAD`

```text
    "test": "jest",												      |	    "test": "jest --passWithNoTests",
    "@launchql/env": "workspace:^",										      |	    "@constructive-io/graphql-env": "workspace:^",
    "@launchql/types": "workspace:^",										      |	    "@constructive-io/graphql-types": "workspace:^",
    "launchql",													      |	    "constructive",
```

</details>

## Navigation
- Prev: [M_9333927dfd80.md](M_9333927dfd80.md) | Up: [graphile.md](../graphile.md) | Index: [README.md](../README.md) | Diffs: [diffs/README.md](README.md) | Snapshots: [SNAPSHOTS.md](../SNAPSHOTS.md) | Next: [M_d74c9b052a37.md](M_d74c9b052a37.md)
