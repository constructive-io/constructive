# viewTable

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Junction table linking views to their joined tables for referential integrity

## Usage

```typescript
useViewTablesQuery({ selection: { fields: { databaseId: true, id: true, joinOrder: true, tableId: true, viewId: true } } })
useViewTableQuery({ id: '<UUID>', selection: { fields: { databaseId: true, id: true, joinOrder: true, tableId: true, viewId: true } } })
useCreateViewTableMutation({ selection: { fields: { id: true } } })
useUpdateViewTableMutation({ selection: { fields: { id: true } } })
useDeleteViewTableMutation({})
```

## Examples

### List all viewTables

```typescript
const { data, isLoading } = useViewTablesQuery({
  selection: { fields: { databaseId: true, id: true, joinOrder: true, tableId: true, viewId: true } },
});
```

### Create a viewTable

```typescript
const { mutate } = useCreateViewTableMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', joinOrder: '<Int>', tableId: '<UUID>', viewId: '<UUID>' });
```
