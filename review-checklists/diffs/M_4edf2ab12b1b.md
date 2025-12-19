# Diff — `M` `packages/client/package.json`

## Navigation
- Prev: [M_89fdd7e04261.md](M_89fdd7e04261.md) | Up: [packages/client.md](../packages/client.md) | Index: [README.md](../README.md) | Diffs: [diffs/README.md](README.md) | Snapshots: [SNAPSHOTS.md](../SNAPSHOTS.md) | Next: [R056_3c106625db29.md](R056_3c106625db29.md)

## Context
- Diff base (merge base for `main...HEAD`): `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Main tip: `2492d840ab18e5c30cc7a24a7b4959abf5d6b21e`
- Head: `refactor/ensure-new-name-mappings` @ `27ba20cfc1e66cb921f229963ca63a201fcf6952`
- Module: `packages/client`
- Numstat: `+2/-2`
- Reproduce: `git diff main...HEAD -- packages/client/package.json`

## Changes (line-aligned)
- `  "name": "@constructive-io/client",`
  - `pgpmjs` → `constructive-io`
- `    "test": "jest --passWithNoTests",`
  - `` → `--passWithNoTests`

## Full diff (side-by-side, changed lines only)
<details>
<summary>Show</summary>

- Left = diff base, Right = `HEAD`
- Legend: `|` changed, `<` only in base, `>` only in `HEAD`

```text
  "name": "@pgpmjs/client",											      |	  "name": "@constructive-io/client",
    "test": "jest",												      |	    "test": "jest --passWithNoTests",
```

</details>

## Navigation
- Prev: [M_89fdd7e04261.md](M_89fdd7e04261.md) | Up: [packages/client.md](../packages/client.md) | Index: [README.md](../README.md) | Diffs: [diffs/README.md](README.md) | Snapshots: [SNAPSHOTS.md](../SNAPSHOTS.md) | Next: [R056_3c106625db29.md](R056_3c106625db29.md)
