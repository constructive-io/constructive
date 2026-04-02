# provisionTable

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Composable table provisioning: creates or finds a table, then creates fields (so Data* modules can reference them), applies N nodes (Data* modules), enables RLS, creates grants, creates N policies, and optionally creates table-level indexes/full_text_searches/unique_constraints. All operations are graceful (skip existing). Accepts multiple nodes and multiple policies per call, unlike secure_table_provision which is limited to one of each. Returns (out_table_id, out_fields).

## Usage

```bash
csdk provision-table --input.clientMutationId <String> --input.databaseId <UUID> --input.schemaId <UUID> --input.tableName <String> --input.tableId <UUID> --input.nodes <JSON> --input.fields <JSON> --input.policies <JSON> --input.grants <JSON> --input.grantRoles <String> --input.useRls <Boolean> --input.indexes <JSON> --input.fullTextSearches <JSON> --input.uniqueConstraints <JSON>
```

## Examples

### Run provisionTable

```bash
csdk provision-table --input.clientMutationId <String> --input.databaseId <UUID> --input.schemaId <UUID> --input.tableName <String> --input.tableId <UUID> --input.nodes <JSON> --input.fields <JSON> --input.policies <JSON> --input.grants <JSON> --input.grantRoles <String> --input.useRls <Boolean> --input.indexes <JSON> --input.fullTextSearches <JSON> --input.uniqueConstraints <JSON>
```
