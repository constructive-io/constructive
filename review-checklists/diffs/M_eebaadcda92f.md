# Diff — `M` `packages/cli/test-utils/CLIDeployTestFixture.ts`

## Navigation
- Prev: [M_d4a5942ddcab.md](M_d4a5942ddcab.md) | Up: [packages/cli.md](../packages/cli.md) | Index: [README.md](../README.md) | Diffs: [diffs/README.md](README.md) | Snapshots: [SNAPSHOTS.md](../SNAPSHOTS.md) | Next: [M_e00d46bdec94.md](M_e00d46bdec94.md)

## Context
- Diff base (merge base for `main...HEAD`): `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Main tip: `2492d840ab18e5c30cc7a24a7b4959abf5d6b21e`
- Head: `refactor/ensure-new-name-mappings` @ `27ba20cfc1e66cb921f229963ca63a201fcf6952`
- Module: `packages/cli`
- Numstat: `+2/-2`
- Reproduce: `git diff main...HEAD -- packages/cli/test-utils/CLIDeployTestFixture.ts`

## Changes (line-aligned)
- `      } else if (tokens[0] === 'cnc' || tokens[0] === 'constructive') {`
  - `lql` → `cnc`
  - `launchql` → `constructive`
- `        // Handle Constructive CLI commands`
  - `LaunchQL` → `Constructive`

## Full diff (side-by-side, changed lines only)
<details>
<summary>Show</summary>

- Left = diff base, Right = `HEAD`
- Legend: `|` changed, `<` only in base, `>` only in `HEAD`

```text
      } else if (tokens[0] === 'lql' || tokens[0] === 'launchql') {						      |	      } else if (tokens[0] === 'cnc' || tokens[0] === 'constructive') {
        // Handle LaunchQL CLI commands										      |	        // Handle Constructive CLI commands
```

</details>

## Navigation
- Prev: [M_d4a5942ddcab.md](M_d4a5942ddcab.md) | Up: [packages/cli.md](../packages/cli.md) | Index: [README.md](../README.md) | Diffs: [diffs/README.md](README.md) | Snapshots: [SNAPSHOTS.md](../SNAPSHOTS.md) | Next: [M_e00d46bdec94.md](M_e00d46bdec94.md)
