---
name: hooks-public-view-table
description: Junction table linking views to their joined tables for referential integrity
---

# hooks-public-view-table

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Junction table linking views to their joined tables for referential integrity

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
