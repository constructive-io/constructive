# constructBlueprint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Executes a blueprint definition by delegating to provision_* procedures. Creates a blueprint_construction record to track the attempt. Five phases: (1) provision_table() for each table with all nodes[], fields[], policies[], grants, and table-level indexes/fts/unique_constraints in a single call, (2) provision_relation() for each relation, (3) provision_index() for top-level indexes, (4) provision_full_text_search() for top-level FTS, (5) provision_unique_constraint() for top-level unique constraints. Tables are identified by table_name with optional per-table schema_name. Relations use $type for relation_type with source_table/target_table. Returns the construction record ID on success, NULL on failure.

## Usage

```bash
csdk construct-blueprint --input.clientMutationId <String> --input.blueprintId <UUID> --input.schemaId <UUID>
```

## Examples

### Run constructBlueprint

```bash
csdk construct-blueprint --input.clientMutationId <String> --input.blueprintId <UUID> --input.schemaId <UUID>
```
