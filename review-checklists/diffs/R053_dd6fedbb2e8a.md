# Diff — `R053` `packages/core/__tests__/core/__snapshots__/module-extensions-with-tags.test.ts.snap` → `pgpm/core/__tests__/core/__snapshots__/module-extensions-with-tags.test.ts.snap`

## Context
- Base: `main` @ `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Head: `refactor/ensure-new-name-mappings` @ `bd9be723c96aeb1f9f69e4946acbd9241ee8da50`
- Merge base: `86d74dc4fce9051df0d2b5bcc163607aba42f009`
- Type: rename/copy (similarity `53`)
- Numstat: `+17/-16`
- Reproduce: `git diff -M main...HEAD -- packages/core/__tests__/core/__snapshots__/module-extensions-with-tags.test.ts.snap pgpm/core/__tests__/core/__snapshots__/module-extensions-with-tags.test.ts.snap`

## Guideline token summary
- Deltas: `constructive`: 0 → 32; `launchql`: 32 → 0

## Side-by-side diff (only changed lines)
- Left = `main`, Right = `HEAD`
- Legend: `|` changed, `<` only in `main`, `>` only in `HEAD`

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
