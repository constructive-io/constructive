# Diff — `M` `TODO.md`

## Navigation
- Prev: [M_b7a541aa7daa.md](M_b7a541aa7daa.md) | Up: [ROOT.md](../ROOT.md) | Index: [README.md](../README.md) | Diffs: [diffs/README.md](README.md) | Snapshots: [SNAPSHOTS.md](../SNAPSHOTS.md) | Next: [M_f14c5dbb41f8.md](M_f14c5dbb41f8.md)

## Context
- Diff base (merge base for `main...HEAD`): `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Main tip: `2492d840ab18e5c30cc7a24a7b4959abf5d6b21e`
- Head: `refactor/ensure-new-name-mappings` @ `27ba20cfc1e66cb921f229963ca63a201fcf6952`
- Module: `ROOT`
- Numstat: `+6/-6`
- Reproduce: `git diff main...HEAD -- TODO.md`

## Changes (line-aligned)
- `postgres/pgsql-test/src/seed/sqitch.ts`
  - `packages` → `postgres`
- `- [ ] Add tests for @constructive-io/graphql-react`
  - `launchql` → `constructive-io`
  - `` → `graphql-`
- `- [ ] Get this PR for GraphQL codegen: https://github.com/constructive-io/constructive-gen/pull/19`
  - `from` → `for`
  - `launchql-gen` → `GraphQL codegen`
- `- [x] Import original legacy history (preserve git log)`
  - `LaunchQL` → `legacy`
- ``- [x] Get boilerplate (`constructive init`) working``
  - `lql` → `constructive`
- `      - Context: stage fixture (unique-names) pre-generated plan with includePackages=false and includeTags=false currently fails deployment (see test in pgpm/core/__tests__/migration/stage-deploymen…`
  - `packages` → `pgpm`

## Full diff (side-by-side, changed lines only)
<details>
<summary>Show</summary>

- Left = diff base, Right = `HEAD`
- Legend: `|` changed, `<` only in base, `>` only in `HEAD`

```text
packages/pgsql-test/src/seed/sqitch.ts										      |	postgres/pgsql-test/src/seed/sqitch.ts
- [ ] Add tests for @launchql/react										      |	- [ ] Add tests for @constructive-io/graphql-react
- [ ] Get this PR from launchql-gen: https://github.com/constructive-io/constructive-gen/pull/19		      |	- [ ] Get this PR for GraphQL codegen: https://github.com/constructive-io/constructive-gen/pull/19
- [x] Import original LaunchQL history (preserve git log)							      |	- [x] Import original legacy history (preserve git log)
- [x] Get boilerplate (`lql init`) working									      |	- [x] Get boilerplate (`constructive init`) working
      - Context: stage fixture (unique-names) pre-generated plan with includePackages=false and includeTags=false cur |	      - Context: stage fixture (unique-names) pre-generated plan with includePackages=false and includeTags=false cur
```

</details>

## Navigation
- Prev: [M_b7a541aa7daa.md](M_b7a541aa7daa.md) | Up: [ROOT.md](../ROOT.md) | Index: [README.md](../README.md) | Diffs: [diffs/README.md](README.md) | Snapshots: [SNAPSHOTS.md](../SNAPSHOTS.md) | Next: [M_f14c5dbb41f8.md](M_f14c5dbb41f8.md)
