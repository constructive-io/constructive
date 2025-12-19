# Diff — `R053` `packages/core/__tests__/core/__snapshots__/module-extensions-with-tags.test.ts.snap` → `pgpm/core/__tests__/core/__snapshots__/module-extensions-with-tags.test.ts.snap`

## Navigation
- Prev: [R096_3a78d6312c48.md](R096_3a78d6312c48.md) | Up: [packages/core.md](../packages/core.md) | Index: [README.md](../README.md) | Diffs: [diffs/README.md](README.md) | Snapshots: [SNAPSHOTS.md](../SNAPSHOTS.md) | Next: [R096_0f47d0214543.md](R096_0f47d0214543.md)

## Context
- Diff base (merge base for `main...HEAD`): `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Main tip: `2492d840ab18e5c30cc7a24a7b4959abf5d6b21e`
- Head: `refactor/ensure-new-name-mappings` @ `27ba20cfc1e66cb921f229963ca63a201fcf6952`
- Module: `packages/core`
- Type: rename/copy (similarity `53`)
- Numstat: `+17/-16`
- Reproduce: `git diff -M main...HEAD -- packages/core/__tests__/core/__snapshots__/module-extensions-with-tags.test.ts.snap pgpm/core/__tests__/core/__snapshots__/module-extensions-with-tags.test.ts.snap`

## Summary
- Larger change (not cleanly line-aligned)
- Token deltas: `constructive`: 0 → 32; `launchql`: 32 → 0

## Key replacements
- `create_schema [my-first:@v1.1.0 my-second:@v2.0.0] 2017-08-11T08:11:51Z constructive <constructive@5b0c196eeb62> # add create_schema`
  - `launchql` → `constructive`
  - `launchql` → `constructive`
- `table_products [schema_myfirstapp table_users] 2017-08-11T08:11:51Z constructive <constructive@5b0c196eeb62> # add table_products"`
  - `launchql` → `constructive`
  - `launchql` → `constructive`
- `table_products [schema_myfirstapp table_users] 2017-08-11T08:11:51Z constructive <constructive@5b0c196eeb62> # add table_products`
  - `launchql` → `constructive`
  - `launchql` → `constructive`
- `create_another_table [create_table] 2017-08-11T08:11:51Z constructive <constructive@5b0c196eeb62> # add create_another_table"`
  - `launchql` → `constructive`
  - `launchql` → `constructive`
- `create_another_table [create_table] 2017-08-11T08:11:51Z constructive <constructive@5b0c196eeb62> # add create_another_table"`
  - `launchql` → `constructive`
  - `launchql` → `constructive`
- `create_table [@v2.0.0 my-second:@v2.1.0] 2017-08-11T08:11:51Z constructive <constructive@5b0c196eeb62> # add create_table"`
  - `launchql` → `constructive`
  - `launchql` → `constructive`
- `create_schema [my-first:@v1.0.0] 2017-08-11T08:11:51Z constructive <constructive@5b0c196eeb62> # add create_schema`
  - `launchql` → `constructive`
  - `launchql` → `constructive`
- `create_schema [my-first:@v1.0.0] 2017-08-11T08:11:51Z constructive <constructive@5b0c196eeb62> # add create_schema`
  - `launchql` → `constructive`
  - `launchql` → `constructive`
- `table_users [schema_myfirstapp] 2017-08-11T08:11:51Z constructive <constructive@5b0c196eeb62> # add table_users`
  - `launchql` → `constructive`
  - `launchql` → `constructive`
- `table_users [schema_myfirstapp] 2017-08-11T08:11:51Z constructive <constructive@5b0c196eeb62> # add table_users`
  - `launchql` → `constructive`
  - `launchql` → `constructive`
- `create_table [create_schema] 2017-08-11T08:11:51Z constructive <constructive@5b0c196eeb62> # add create_table`
  - `launchql` → `constructive`
  - `launchql` → `constructive`
- `create_table [create_schema] 2017-08-11T08:11:51Z constructive <constructive@5b0c196eeb62> # add create_table`
  - `launchql` → `constructive`
  - `launchql` → `constructive`

## Key additions
- `"`

## Full diff (side-by-side, changed lines only)
<details>
<summary>Show</summary>

- Left = diff base, Right = `HEAD`
- Legend: `|` changed, `<` only in base, `>` only in `HEAD`

```text
schema_myfirstapp 2017-08-11T08:11:51Z launchql <launchql@5b0c196eeb62> # add schema_myfirstapp			      |	schema_myfirstapp 2017-08-11T08:11:51Z constructive <constructive@5b0c196eeb62> # add schema_myfirstapp
table_users [schema_myfirstapp] 2017-08-11T08:11:51Z launchql <launchql@5b0c196eeb62> # add table_users		      |	table_users [schema_myfirstapp] 2017-08-11T08:11:51Z constructive <constructive@5b0c196eeb62> # add table_users
table_products [schema_myfirstapp table_users] 2017-08-11T08:11:51Z launchql <launchql@5b0c196eeb62> # add table_prod |	table_products [schema_myfirstapp table_users] 2017-08-11T08:11:51Z constructive <constructive@5b0c196eeb62> # add ta
create_schema [my-first:@v1.0.0] 2017-08-11T08:11:51Z launchql <launchql@5b0c196eeb62> # add create_schema	      |	create_schema [my-first:@v1.0.0] 2017-08-11T08:11:51Z constructive <constructive@5b0c196eeb62> # add create_schema
create_table [create_schema] 2017-08-11T08:11:51Z launchql <launchql@5b0c196eeb62> # add create_table		      |	create_table [create_schema] 2017-08-11T08:11:51Z constructive <constructive@5b0c196eeb62> # add create_table
create_another_table [create_table] 2017-08-11T08:11:51Z launchql <launchql@5b0c196eeb62> # add create_another_table" |	create_another_table [create_table] 2017-08-11T08:11:51Z constructive <constructive@5b0c196eeb62> # add create_anothe
create_schema [my-first:@v1.1.0 my-second:@v2.0.0] 2017-08-11T08:11:51Z launchql <launchql@5b0c196eeb62> # add create |	create_schema [my-first:@v1.1.0 my-second:@v2.0.0] 2017-08-11T08:11:51Z constructive <constructive@5b0c196eeb62> # ad
create_table [@v2.0.0 my-second:@v2.1.0] 2017-08-11T08:11:51Z launchql <launchql@5b0c196eeb62> # add create_table"    |	create_table [@v2.0.0 my-second:@v2.1.0] 2017-08-11T08:11:51Z constructive <constructive@5b0c196eeb62> # add create_t
create_schema [my-first:@v1.0.0] 2017-08-11T08:11:51Z launchql <launchql@5b0c196eeb62> # add create_schema	      |	create_schema [my-first:@v1.0.0] 2017-08-11T08:11:51Z constructive <constructive@5b0c196eeb62> # add create_schema
create_table [create_schema] 2017-08-11T08:11:51Z launchql <launchql@5b0c196eeb62> # add create_table		      |	create_table [create_schema] 2017-08-11T08:11:51Z constructive <constructive@5b0c196eeb62> # add create_table
create_another_table [create_table] 2017-08-11T08:11:51Z launchql <launchql@5b0c196eeb62> # add create_another_table" |	create_another_table [create_table] 2017-08-11T08:11:51Z constructive <constructive@5b0c196eeb62> # add create_anothe
schema_myfirstapp 2017-08-11T08:11:51Z launchql <launchql@5b0c196eeb62> # add schema_myfirstapp			      |	schema_myfirstapp 2017-08-11T08:11:51Z constructive <constructive@5b0c196eeb62> # add schema_myfirstapp
table_users [schema_myfirstapp] 2017-08-11T08:11:51Z launchql <launchql@5b0c196eeb62> # add table_users		      |	table_users [schema_myfirstapp] 2017-08-11T08:11:51Z constructive <constructive@5b0c196eeb62> # add table_users
@v1.0.0 2017-08-11T08:11:51Z launchql <launchql@5b0c196eeb62> # First stable release with users			      |	@v1.0.0 2017-08-11T08:11:51Z constructive <constructive@5b0c196eeb62> # First stable release with users
table_products [schema_myfirstapp table_users] 2017-08-11T08:11:51Z launchql <launchql@5b0c196eeb62> # add table_prod |	table_products [schema_myfirstapp table_users] 2017-08-11T08:11:51Z constructive <constructive@5b0c196eeb62> # add ta
@v1.1.0 2017-08-11T08:11:51Z launchql <launchql@5b0c196eeb62> # Added products feature"				      |	@v1.1.0 2017-08-11T08:11:51Z constructive <constructive@5b0c196eeb62> # Added products feature
														      >	"
```

</details>

## Navigation
- Prev: [R096_3a78d6312c48.md](R096_3a78d6312c48.md) | Up: [packages/core.md](../packages/core.md) | Index: [README.md](../README.md) | Diffs: [diffs/README.md](README.md) | Snapshots: [SNAPSHOTS.md](../SNAPSHOTS.md) | Next: [R096_0f47d0214543.md](R096_0f47d0214543.md)
