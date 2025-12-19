# Diff — `M` `packages/cli/__tests__/package.test.ts`

## Navigation
- Prev: [M_8a5d80b661d6.md](M_8a5d80b661d6.md) | Up: [packages/cli.md](../packages/cli.md) | Index: [README.md](../README.md) | Diffs: [diffs/README.md](README.md) | Snapshots: [SNAPSHOTS.md](../SNAPSHOTS.md) | Next: [M_89c146705071.md](M_89c146705071.md)

## Context
- Diff base (merge base for `main...HEAD`): `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Main tip: `2492d840ab18e5c30cc7a24a7b4959abf5d6b21e`
- Head: `refactor/ensure-new-name-mappings` @ `27ba20cfc1e66cb921f229963ca63a201fcf6952`
- Module: `packages/cli`
- Numstat: `+3/-3`
- Reproduce: `git diff main...HEAD -- packages/cli/__tests__/package.test.ts`

## Changes (line-aligned)
- `    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'constructive-io-graphql-test-'));`
  - `launchql` → `constructive-io-graphql`
- `    const fixtureWorkspace = fixture('constructive');`
  - `launchql` → `constructive`
- `    const workspacePath = path.join(tempDir, 'constructive');`
  - `launchql` → `constructive`

## Full diff (side-by-side, changed lines only)
<details>
<summary>Show</summary>

- Left = diff base, Right = `HEAD`
- Legend: `|` changed, `<` only in base, `>` only in `HEAD`

```text
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'launchql-test-'));						      |	    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'constructive-io-graphql-test-'));
    const fixtureWorkspace = fixture('launchql');								      |	    const fixtureWorkspace = fixture('constructive');
    const workspacePath = path.join(tempDir, 'launchql');							      |	    const workspacePath = path.join(tempDir, 'constructive');
```

</details>

## Navigation
- Prev: [M_8a5d80b661d6.md](M_8a5d80b661d6.md) | Up: [packages/cli.md](../packages/cli.md) | Index: [README.md](../README.md) | Diffs: [diffs/README.md](README.md) | Snapshots: [SNAPSHOTS.md](../SNAPSHOTS.md) | Next: [M_89c146705071.md](M_89c146705071.md)
