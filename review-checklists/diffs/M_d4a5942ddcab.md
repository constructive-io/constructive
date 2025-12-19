# Diff — `M` `packages/cli/src/utils/display.ts`

## Navigation
- Prev: [M_41e763033210.md](M_41e763033210.md) | Up: [packages/cli.md](../packages/cli.md) | Index: [README.md](../README.md) | Diffs: [diffs/README.md](README.md) | Snapshots: [SNAPSHOTS.md](../SNAPSHOTS.md) | Next: [M_eebaadcda92f.md](M_eebaadcda92f.md)

## Context
- Diff base (merge base for `main...HEAD`): `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Main tip: `2492d840ab18e5c30cc7a24a7b4959abf5d6b21e`
- Head: `refactor/ensure-new-name-mappings` @ `27ba20cfc1e66cb921f229963ca63a201fcf6952`
- Module: `packages/cli`
- Numstat: `+7/-7`
- Reproduce: `git diff main...HEAD -- packages/cli/src/utils/display.ts`

## Changes (line-aligned)
- `  Usage: cnc <command> [options]`
  - `lql` → `cnc`
- `         constructive <command> [options]`
  - `launchql` → `constructive`
- `    constructive <command> --help    Display detailed help for specific command`
  - `lql` → `constructive`
- `    constructive <command> -h        Display detailed help for specific command`
  - `lql` → `constructive`
- `    cnc deploy --help       Show deploy command options`
  - `lql` → `cnc`
- `    cnc server --port 8080  Start server on port 8080`
  - `lql` → `cnc`
- `    cnc init workspace      Initialize new workspace`
  - `lql` → `cnc`

## Full diff (side-by-side, changed lines only)
<details>
<summary>Show</summary>

- Left = diff base, Right = `HEAD`
- Legend: `|` changed, `<` only in base, `>` only in `HEAD`

```text
  Usage: lql <command> [options]										      |	  Usage: cnc <command> [options]
         launchql <command> [options]										      |	         constructive <command> [options]
    lql <command> --help    Display detailed help for specific command						      |	    constructive <command> --help    Display detailed help for specific command
    lql <command> -h        Display detailed help for specific command						      |	    constructive <command> -h        Display detailed help for specific command
    lql deploy --help       Show deploy command options								      |	    cnc deploy --help       Show deploy command options
    lql server --port 8080  Start server on port 8080								      |	    cnc server --port 8080  Start server on port 8080
    lql init workspace      Initialize new workspace								      |	    cnc init workspace      Initialize new workspace
```

</details>

## Navigation
- Prev: [M_41e763033210.md](M_41e763033210.md) | Up: [packages/cli.md](../packages/cli.md) | Index: [README.md](../README.md) | Diffs: [diffs/README.md](README.md) | Snapshots: [SNAPSHOTS.md](../SNAPSHOTS.md) | Next: [M_eebaadcda92f.md](M_eebaadcda92f.md)
