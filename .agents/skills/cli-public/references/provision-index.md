# provisionIndex

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Creates an index on a table. Accepts a jsonb definition with columns (array of names or single column string), access_method (default BTREE), is_unique, op_classes, options, and name (auto-generated if omitted). Graceful: skips if an index with the same (table_id, field_ids, access_method) already exists. Returns the index_id.

## Usage

```bash
csdk provision-index --input.clientMutationId <String> --input.databaseId <UUID> --input.tableId <UUID> --input.definition <JSON>
```

## Examples

### Run provisionIndex

```bash
csdk provision-index --input.clientMutationId <String> --input.databaseId <UUID> --input.tableId <UUID> --input.definition <JSON>
```
