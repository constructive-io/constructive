# Diff — `M` `graphile/graphile-test/README.md`

## Navigation
- Prev: [M_e098685c7cd6.md](M_e098685c7cd6.md) | Up: [graphile.md](../graphile.md) | Index: [README.md](../README.md) | Diffs: [diffs/README.md](README.md) | Snapshots: [SNAPSHOTS.md](../SNAPSHOTS.md) | Next: [M_d4c87475f411.md](M_d4c87475f411.md)

## Context
- Diff base (merge base for `main...HEAD`): `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Main tip: `2492d840ab18e5c30cc7a24a7b4959abf5d6b21e`
- Head: `refactor/ensure-new-name-mappings` @ `27ba20cfc1e66cb921f229963ca63a201fcf6952`
- Module: `graphile`
- Numstat: `+3/-3`
- Reproduce: `git diff main...HEAD -- graphile/graphile-test/README.md`

## Changes (line-aligned)
- ```graphile-test` builds on top of [`pgsql-test`](https://github.com/constructive-io/constructive/tree/main/postgres/pgsql-test) to provide robust GraphQL testing utilities for PostGraphile-based proje…``
  - `packages` → `postgres`
- ``**Note:** This is a bare-bones package with no defaults or settings applied. For a batteries-included version with all Constructive plugins pre-configured, use [`@constructive-io/graphql-test`](https…``
  - `LaunchQL` → `Constructive`
  - ``[`launchql`` → ``[`@constructive-io/graphql``
  - `packages` → `graphql`
  - `launchql-` → ``
- ``* 📦 **Seed support** for `.sql`, JSON, CSV, Constructive, or Sqitch``
  - `LaunchQL` → `Constructive`

## Full diff (side-by-side, changed lines only)
<details>
<summary>Show</summary>

- Left = diff base, Right = `HEAD`
- Legend: `|` changed, `<` only in base, `>` only in `HEAD`

```text
`graphile-test` builds on top of [`pgsql-test`](https://github.com/constructive-io/constructive/tree/main/packages/pg |	`graphile-test` builds on top of [`pgsql-test`](https://github.com/constructive-io/constructive/tree/main/postgres/pg
**Note:** This is a bare-bones package with no defaults or settings applied. For a batteries-included version with al |	**Note:** This is a bare-bones package with no defaults or settings applied. For a batteries-included version with al
* 📦 **Seed support** for `.sql`, JSON, CSV, LaunchQL, or Sqitch						      |	* 📦 **Seed support** for `.sql`, JSON, CSV, Constructive, or Sqitch
```

</details>

## Navigation
- Prev: [M_e098685c7cd6.md](M_e098685c7cd6.md) | Up: [graphile.md](../graphile.md) | Index: [README.md](../README.md) | Diffs: [diffs/README.md](README.md) | Snapshots: [SNAPSHOTS.md](../SNAPSHOTS.md) | Next: [M_d4c87475f411.md](M_d4c87475f411.md)
