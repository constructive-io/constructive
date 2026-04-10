# constructBlueprint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Executes a blueprint definition by delegating to provision_* procedures. Creates a blueprint_construction record to track the attempt. Five phases: (1) provision_table() for each table with nodes[], fields[], policies[], and grants (table-level indexes/fts/unique_constraints are deferred), (2) provision_relation() for each relation, (3) provision_index() for top-level + deferred indexes, (4) provision_full_text_search() for top-level + deferred FTS, (5) provision_unique_constraint() for top-level + deferred unique constraints. Table-level indexes/fts/unique_constraints are deferred to phases 3-5 so they can reference columns created by relations in phase 2. Tables are identified by table_name with optional per-table schema_name. Relations use $type for relation_type with source_table/target_table. Returns the construction record ID on success, NULL on failure.

## Usage

```typescript
db.mutation.constructBlueprint({ input: { blueprintId: '<UUID>', schemaId: '<UUID>' } }).execute()
```

## Examples

### Run constructBlueprint

```typescript
const result = await db.mutation.constructBlueprint({ input: { blueprintId: '<UUID>', schemaId: '<UUID>' } }).execute();
```
