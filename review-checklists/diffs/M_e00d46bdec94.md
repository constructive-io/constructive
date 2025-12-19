# Diff — `M` `packages/cli/test-utils/fixtures.ts`

## Navigation
- Prev: [M_eebaadcda92f.md](M_eebaadcda92f.md) | Up: [packages/cli.md](../packages/cli.md) | Index: [README.md](../README.md) | Diffs: [diffs/README.md](README.md) | Snapshots: [SNAPSHOTS.md](../SNAPSHOTS.md) | Next: [M_d0795c369d8d.md](M_d0795c369d8d.md)

## Context
- Diff base (merge base for `main...HEAD`): `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Main tip: `2492d840ab18e5c30cc7a24a7b4959abf5d6b21e`
- Head: `refactor/ensure-new-name-mappings` @ `27ba20cfc1e66cb921f229963ca63a201fcf6952`
- Module: `packages/cli`
- Numstat: `+1/-1`
- Reproduce: `git diff main...HEAD -- packages/cli/test-utils/fixtures.ts`

## Changes (line-aligned)
- `    this.tempDir = mkdtempSync(path.join(os.tmpdir(), 'constructive-io-graphql-test-'));`
  - `launchql` → `constructive-io-graphql`

## Full diff (side-by-side, changed lines only)
<details>
<summary>Show</summary>

- Left = diff base, Right = `HEAD`
- Legend: `|` changed, `<` only in base, `>` only in `HEAD`

```text
    this.tempDir = mkdtempSync(path.join(os.tmpdir(), 'launchql-test-'));					      |	    this.tempDir = mkdtempSync(path.join(os.tmpdir(), 'constructive-io-graphql-test-'));
```

</details>

## Navigation
- Prev: [M_eebaadcda92f.md](M_eebaadcda92f.md) | Up: [packages/cli.md](../packages/cli.md) | Index: [README.md](../README.md) | Diffs: [diffs/README.md](README.md) | Snapshots: [SNAPSHOTS.md](../SNAPSHOTS.md) | Next: [M_d0795c369d8d.md](M_d0795c369d8d.md)
