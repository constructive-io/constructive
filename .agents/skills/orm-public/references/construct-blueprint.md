# constructBlueprint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Executes a blueprint definition by delegating to provision_* procedures. Creates a blueprint_construction record to track the attempt. Six phases: (0) entity_type_provision for each membership_type entry — provisions entity tables, membership modules, and security, (1) provision_table() for each table with nodes[], fields[], policies[], and grants (table-level indexes/fts/unique_constraints are deferred), (2) provision_relation() for each relation, (3) provision_index() for top-level + deferred indexes, (4) provision_full_text_search() for top-level + deferred FTS, (5) provision_unique_constraint() for top-level + deferred unique constraints. Phase 0 entity tables are added to the table_map so subsequent phases can reference them by name. Table-level indexes/fts/unique_constraints are deferred to phases 3-5 so they can reference columns created by relations in phase 2. Returns the construction record ID on success, NULL on failure.

## Usage

```typescript
db.mutation.constructBlueprint({ input: { blueprintId: '<UUID>', schemaId: '<UUID>' } }).execute()
```

## Examples

### Run constructBlueprint

```typescript
const result = await db.mutation.constructBlueprint({ input: { blueprintId: '<UUID>', schemaId: '<UUID>' } }).execute();
```
