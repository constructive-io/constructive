# Diff — `R084` `packages/core/__tests__/core/launchql-project.test.ts` → `pgpm/core/__tests__/core/constructive-project.test.ts`

## Navigation
- Prev: [R096_477208b0821c.md](R096_477208b0821c.md) | Up: [packages/core.md](../packages/core.md) | Index: [README.md](../README.md) | Diffs: [diffs/README.md](README.md) | Snapshots: [SNAPSHOTS.md](../SNAPSHOTS.md) | Next: [R079_c3cdb788ca7c.md](R079_c3cdb788ca7c.md)

## Context
- Diff base (merge base for `main...HEAD`): `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Main tip: `2492d840ab18e5c30cc7a24a7b4959abf5d6b21e`
- Head: `refactor/ensure-new-name-mappings` @ `27ba20cfc1e66cb921f229963ca63a201fcf6952`
- Module: `packages/core`
- Type: rename/copy (similarity `84`)
- Numstat: `+13/-13`
- Reproduce: `git diff -M main...HEAD -- packages/core/__tests__/core/launchql-project.test.ts pgpm/core/__tests__/core/constructive-project.test.ts`

## Changes (line-aligned)
- `    const cwd = fixture.getFixturePath('constructive');`
  - `launchql` → `constructive`
- `    const cwd = fixture.getFixturePath('constructive', 'packages', 'secrets');`
  - `launchql` → `constructive`
- `    const cwd = fixture.getFixturePath('constructive');`
  - `launchql` → `constructive`
- `    const cwd = fixture.getFixturePath('constructive', 'packages', 'secrets');`
  - `launchql` → `constructive`
- `    const cwd = fixture.getFixturePath('constructive', 'packages', 'secrets');`
  - `launchql` → `constructive`
- `    const cwd = fixture.getFixturePath('constructive', 'packages', 'secrets');`
  - `launchql` → `constructive`
- `    const cwd = fixture.getFixturePath('constructive');`
  - `launchql` → `constructive`
- `    const cwd = fixture.getFixturePath('constructive');`
  - `launchql` → `constructive`
- `    const cwd = fixture.getFixturePath('constructive', 'packages', 'secrets');`
  - `launchql` → `constructive`
- `    const cwd = fixture.getFixturePath('constructive');`
  - `launchql` → `constructive`
- `    const cwd = fixture.getFixturePath('constructive');`
  - `launchql` → `constructive`
- `    const cwd = fixture.getFixturePath('constructive');`
  - `launchql` → `constructive`
- `    const cwd = fixture.getFixturePath('constructive');`
  - `launchql` → `constructive`

## Full diff (side-by-side, changed lines only)
<details>
<summary>Show</summary>

- Left = diff base, Right = `HEAD`
- Legend: `|` changed, `<` only in base, `>` only in `HEAD`

```text
    const cwd = fixture.getFixturePath('launchql');								      |	    const cwd = fixture.getFixturePath('constructive');
    const cwd = fixture.getFixturePath('launchql', 'packages', 'secrets');					      |	    const cwd = fixture.getFixturePath('constructive', 'packages', 'secrets');
    const cwd = fixture.getFixturePath('launchql');								      |	    const cwd = fixture.getFixturePath('constructive');
    const cwd = fixture.getFixturePath('launchql', 'packages', 'secrets');					      |	    const cwd = fixture.getFixturePath('constructive', 'packages', 'secrets');
    const cwd = fixture.getFixturePath('launchql', 'packages', 'secrets');					      |	    const cwd = fixture.getFixturePath('constructive', 'packages', 'secrets');
    const cwd = fixture.getFixturePath('launchql', 'packages', 'secrets');					      |	    const cwd = fixture.getFixturePath('constructive', 'packages', 'secrets');
    const cwd = fixture.getFixturePath('launchql');								      |	    const cwd = fixture.getFixturePath('constructive');
    const cwd = fixture.getFixturePath('launchql');								      |	    const cwd = fixture.getFixturePath('constructive');
    const cwd = fixture.getFixturePath('launchql', 'packages', 'secrets');					      |	    const cwd = fixture.getFixturePath('constructive', 'packages', 'secrets');
    const cwd = fixture.getFixturePath('launchql');								      |	    const cwd = fixture.getFixturePath('constructive');
    const cwd = fixture.getFixturePath('launchql');								      |	    const cwd = fixture.getFixturePath('constructive');
    const cwd = fixture.getFixturePath('launchql');								      |	    const cwd = fixture.getFixturePath('constructive');
    const cwd = fixture.getFixturePath('launchql');								      |	    const cwd = fixture.getFixturePath('constructive');
```

</details>

## Navigation
- Prev: [R096_477208b0821c.md](R096_477208b0821c.md) | Up: [packages/core.md](../packages/core.md) | Index: [README.md](../README.md) | Diffs: [diffs/README.md](README.md) | Snapshots: [SNAPSHOTS.md](../SNAPSHOTS.md) | Next: [R079_c3cdb788ca7c.md](R079_c3cdb788ca7c.md)
