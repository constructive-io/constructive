# resolveBlueprintTable

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Resolves a table_name (with optional schema_name) to a table_id. Resolution order: (1) if schema_name provided, exact lookup via metaschema_public.schema.name + metaschema_public.table; (2) check local table_map (tables created in current blueprint); (3) search metaschema_public.table by name across all schemas; (4) if multiple matches, throw ambiguous error asking for schema_name; (5) if no match, throw not-found error.

## Usage

```typescript
db.query.resolveBlueprintTable({ databaseId: '<UUID>', tableName: '<String>', schemaName: '<String>', tableMap: '<JSON>', defaultSchemaId: '<UUID>' }).execute()
```

## Examples

### Run resolveBlueprintTable

```typescript
const result = await db.query.resolveBlueprintTable({ databaseId: '<UUID>', tableName: '<String>', schemaName: '<String>', tableMap: '<JSON>', defaultSchemaId: '<UUID>' }).execute();
```
