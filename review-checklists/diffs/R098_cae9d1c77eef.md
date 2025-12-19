# Diff — `R098` `packages/react/__tests__/basic.test.tsx` → `graphql/react/__tests__/basic.test.tsx`

## Navigation
- Prev: [R070_367e5e1354c5.md](R070_367e5e1354c5.md) | Up: [packages/react.md](../packages/react.md) | Index: [README.md](../README.md) | Diffs: [diffs/README.md](README.md) | Snapshots: [SNAPSHOTS.md](../SNAPSHOTS.md) | Next: [R084_74f79a1da407.md](R084_74f79a1da407.md)

## Context
- Diff base (merge base for `main...HEAD`): `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Main tip: `2492d840ab18e5c30cc7a24a7b4959abf5d6b21e`
- Head: `refactor/ensure-new-name-mappings` @ `27ba20cfc1e66cb921f229963ca63a201fcf6952`
- Module: `packages/react`
- Type: rename/copy (similarity `98`)
- Numstat: `+2/-2`
- Reproduce: `git diff -M main...HEAD -- packages/react/__tests__/basic.test.tsx graphql/react/__tests__/basic.test.tsx`

## Changes (line-aligned)
- `  useConstructiveQuery,`
  - `useLaunchqlQuery` → `useConstructiveQuery`
- `  const queryBuilder = useConstructiveQuery();`
  - `lqlClient` → `queryBuilder`
  - `useLaunchqlQuery` → `useConstructiveQuery`

## Full diff (side-by-side, changed lines only)
<details>
<summary>Show</summary>

- Left = diff base, Right = `HEAD`
- Legend: `|` changed, `<` only in base, `>` only in `HEAD`

```text
  useLaunchqlQuery,												      |	  useConstructiveQuery,
  const lqlClient = useLaunchqlQuery();										      |	  const queryBuilder = useConstructiveQuery();
```

</details>

## Navigation
- Prev: [R070_367e5e1354c5.md](R070_367e5e1354c5.md) | Up: [packages/react.md](../packages/react.md) | Index: [README.md](../README.md) | Diffs: [diffs/README.md](README.md) | Snapshots: [SNAPSHOTS.md](../SNAPSHOTS.md) | Next: [R084_74f79a1da407.md](R084_74f79a1da407.md)
