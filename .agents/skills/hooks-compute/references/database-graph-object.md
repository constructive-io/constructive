# databaseGraphObject

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children

## Usage

```typescript
useDatabaseGraphObjectsQuery({ selection: { fields: { createdAt: true, data: true, databaseId: true, id: true, kids: true, ktree: true } } })
useDatabaseGraphObjectQuery({ id: '<UUID>', selection: { fields: { createdAt: true, data: true, databaseId: true, id: true, kids: true, ktree: true } } })
useCreateDatabaseGraphObjectMutation({ selection: { fields: { id: true } } })
useUpdateDatabaseGraphObjectMutation({ selection: { fields: { id: true } } })
useDeleteDatabaseGraphObjectMutation({})
```

## Examples

### List all databaseGraphObjects

```typescript
const { data, isLoading } = useDatabaseGraphObjectsQuery({
  selection: { fields: { createdAt: true, data: true, databaseId: true, id: true, kids: true, ktree: true } },
});
```

### Create a databaseGraphObject

```typescript
const { mutate } = useCreateDatabaseGraphObjectMutation({
  selection: { fields: { id: true } },
});
mutate({ data: '<JSON>', databaseId: '<UUID>', kids: '<UUID>', ktree: '<String>' });
```
