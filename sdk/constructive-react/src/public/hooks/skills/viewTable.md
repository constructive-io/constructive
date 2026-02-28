# hooks-viewTable

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for ViewTable data operations

## Usage

```typescript
useViewTablesQuery({ selection: { fields: { id: true, viewId: true, tableId: true, joinOrder: true } } })
useViewTableQuery({ id: '<value>', selection: { fields: { id: true, viewId: true, tableId: true, joinOrder: true } } })
useCreateViewTableMutation({ selection: { fields: { id: true } } })
useUpdateViewTableMutation({ selection: { fields: { id: true } } })
useDeleteViewTableMutation({})
```

## Examples

### List all viewTables

```typescript
const { data, isLoading } = useViewTablesQuery({
  selection: { fields: { id: true, viewId: true, tableId: true, joinOrder: true } },
});
```

### Create a viewTable

```typescript
const { mutate } = useCreateViewTableMutation({
  selection: { fields: { id: true } },
});
mutate({ viewId: '<value>', tableId: '<value>', joinOrder: '<value>' });
```
