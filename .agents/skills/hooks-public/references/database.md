# database

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for Database data operations

## Usage

```typescript
useDatabasesQuery({ selection: { fields: { id: true, ownerId: true, schemaHash: true, name: true, label: true, hash: true, createdAt: true, updatedAt: true } } })
useDatabaseQuery({ id: '<UUID>', selection: { fields: { id: true, ownerId: true, schemaHash: true, name: true, label: true, hash: true, createdAt: true, updatedAt: true } } })
useCreateDatabaseMutation({ selection: { fields: { id: true } } })
useUpdateDatabaseMutation({ selection: { fields: { id: true } } })
useDeleteDatabaseMutation({})
```

## Examples

### List all databases

```typescript
const { data, isLoading } = useDatabasesQuery({
  selection: { fields: { id: true, ownerId: true, schemaHash: true, name: true, label: true, hash: true, createdAt: true, updatedAt: true } },
});
```

### Create a database

```typescript
const { mutate } = useCreateDatabaseMutation({
  selection: { fields: { id: true } },
});
mutate({ ownerId: '<UUID>', schemaHash: '<String>', name: '<String>', label: '<String>', hash: '<UUID>' });
```
