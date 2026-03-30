# constructBlueprint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Executes a draft blueprint definition. Four phases: (1) create tables with nodes[], fields, and policies[], (2) create relations between tables, (3) create indexes on table fields (supports BTREE, HNSW, GIN, GIST, BM25, etc.), (4) create full-text search configurations with weighted multi-field TSVector support. nodes[] entries can be strings or {$type, data} objects. Relations use $type for relation_type with junction config as top-level fields (node_type, policy_type, grant_roles, grant_privileges, policy_data, policy_permissive, source_field_name, target_field_name, node_data). Indexes reference table_ref + column name(s) and are resolved to field_ids. Full-text searches reference table_ref + tsvector field + source fields with weights/langs. Builds a ref_map of local ref names to created table UUIDs. Updates blueprint status to constructed (or failed with error_details). Returns the ref_map.

## Usage

```bash
csdk construct-blueprint --input.clientMutationId <String> --input.blueprintId <UUID> --input.schemaId <UUID>
```

## Examples

### Run constructBlueprint

```bash
csdk construct-blueprint --input.clientMutationId <String> --input.blueprintId <UUID> --input.schemaId <UUID>
```
