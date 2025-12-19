# Diff — `M` `DEVELOPMENT.md`

## Navigation
- Prev: [M_b04006d051d9.md](M_b04006d051d9.md) | Up: [ROOT.md](../ROOT.md) | Index: [README.md](../README.md) | Diffs: [diffs/README.md](README.md) | Snapshots: [SNAPSHOTS.md](../SNAPSHOTS.md) | Next: [M_db8d645b2a0e.md](M_db8d645b2a0e.md)

## Context
- Diff base (merge base for `main...HEAD`): `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Main tip: `2492d840ab18e5c30cc7a24a7b4959abf5d6b21e`
- Head: `refactor/ensure-new-name-mappings` @ `27ba20cfc1e66cb921f229963ca63a201fcf6952`
- Module: `ROOT`
- Numstat: `+9/-9`
- Reproduce: `git diff main...HEAD -- DEVELOPMENT.md`

## Summary
- Larger change (not cleanly line-aligned)
- Token deltas: `lql`: 2 → 0

## Key replacements
- ```````sh````
  - ```````sh```` → ```````sh````
- `pnpm install`
  - `pnpm install` → `pnpm install`
- `pnpm build`
  - `pnpm build` → `pnpm build`
- ```````````
  - ``````````` → ```````````

## Key additions
- `Install dependencies and build:`
- ``Seed the `app_user` roles used by tests:``
- `pnpm --filter pgpm exec node dist/index.js admin-users bootstrap --yes`
- `pnpm --filter pgpm exec node dist/index.js admin-users add --test --yes`
- `cd pgpm/core`

## Key removals
- `lql admin-users bootstrap --yes`
- `lql admin-users add --test --yes`
- `Make sure you have the psql client, and then run this:`
- `Then you can run`
- `cd packages/core`

## Full diff (side-by-side, changed lines only)
<details>
<summary>Show</summary>

- Left = diff base, Right = `HEAD`
- Legend: `|` changed, `<` only in base, `>` only in `HEAD`

```text
Make sure you have the psql client, and then run this:								      |	Install dependencies and build:
lql admin-users bootstrap --yes											      |	pnpm install
lql admin-users add --test --yes										      |	pnpm build
Then you can "install" the packages need (optional):								      |	Seed the `app_user` roles used by tests:
docker exec postgres /sql-bin/install.sh									      |	pnpm --filter pgpm exec node dist/index.js admin-users bootstrap --yes
														      >	pnpm --filter pgpm exec node dist/index.js admin-users add --test --yes
Then you can run												      |	Then you can "install" the packages need (optional):
pnpm install													      |	docker exec postgres /sql-bin/install.sh
pnpm build													      <	
cd packages/core												      |	cd pgpm/core
```

</details>

## Navigation
- Prev: [M_b04006d051d9.md](M_b04006d051d9.md) | Up: [ROOT.md](../ROOT.md) | Index: [README.md](../README.md) | Diffs: [diffs/README.md](README.md) | Snapshots: [SNAPSHOTS.md](../SNAPSHOTS.md) | Next: [M_db8d645b2a0e.md](M_db8d645b2a0e.md)
