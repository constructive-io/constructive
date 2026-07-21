# database

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for Database data operations

## Usage

```typescript
useDatabasesQuery({ selection: { fields: { createdAt: true, hash: true, id: true, label: true, name: true, ownerId: true, platform: true, schemaHash: true, updatedAt: true } } })
useDatabaseQuery({ id: '<UUID>', selection: { fields: { createdAt: true, hash: true, id: true, label: true, name: true, ownerId: true, platform: true, schemaHash: true, updatedAt: true } } })
useCreateDatabaseMutation({ selection: { fields: { id: true } } })
useUpdateDatabaseMutation({ selection: { fields: { id: true } } })
useDeleteDatabaseMutation({})
```

## Examples

### List all databases

```typescript
const { data, isLoading } = useDatabasesQuery({
  selection: { fields: { createdAt: true, hash: true, id: true, label: true, name: true, ownerId: true, platform: true, schemaHash: true, updatedAt: true } },
});
```

### Create a database

```typescript
const { mutate } = useCreateDatabaseMutation({
  selection: { fields: { id: true } },
});
mutate({ hash: '<UUID>', label: '<String>', name: '<String>', ownerId: '<UUID>', platform: '<Boolean>', schemaHash: '<String>' });
```
