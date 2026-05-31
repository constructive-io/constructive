# resolveBlueprintField

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Resolves a field_name within a given table_id to a field_id. Throws if no match is found. Used by construct_blueprint to translate user-authored field names (e.g. "location") into field UUIDs for downstream provisioning procedures. table_id must already be resolved (via resolve_blueprint_table) before calling this.

## Usage

```typescript
useResolveBlueprintFieldQuery({ databaseId: '<UUID>', tableId: '<UUID>', fieldName: '<String>' })
```

## Examples

### Use useResolveBlueprintFieldQuery

```typescript
const { data, isLoading } = useResolveBlueprintFieldQuery({ databaseId: '<UUID>', tableId: '<UUID>', fieldName: '<String>' });
```
