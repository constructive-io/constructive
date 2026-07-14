# tableGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for TableGrant data operations

## Usage

```typescript
useTableGrantsQuery({ selection: { fields: { createdAt: true, databaseId: true, fieldIds: true, granteeName: true, id: true, isGrant: true, privilege: true, tableId: true, updatedAt: true } } })
useTableGrantQuery({ id: '<UUID>', selection: { fields: { createdAt: true, databaseId: true, fieldIds: true, granteeName: true, id: true, isGrant: true, privilege: true, tableId: true, updatedAt: true } } })
useCreateTableGrantMutation({ selection: { fields: { id: true } } })
useUpdateTableGrantMutation({ selection: { fields: { id: true } } })
useDeleteTableGrantMutation({})
```

## Examples

### List all tableGrants

```typescript
const { data, isLoading } = useTableGrantsQuery({
  selection: { fields: { createdAt: true, databaseId: true, fieldIds: true, granteeName: true, id: true, isGrant: true, privilege: true, tableId: true, updatedAt: true } },
});
```

### Create a tableGrant

```typescript
const { mutate } = useCreateTableGrantMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', fieldIds: '<UUID>', granteeName: '<String>', isGrant: '<Boolean>', privilege: '<String>', tableId: '<UUID>' });
```
