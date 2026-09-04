# databaseGraphStore

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Named stores — one per version-controlled tree (e.g. one graph, one definition set)

## Usage

```typescript
useDatabaseGraphStoresQuery({ selection: { fields: { createdAt: true, databaseId: true, hash: true, id: true, name: true } } })
useDatabaseGraphStoreQuery({ id: '<UUID>', selection: { fields: { createdAt: true, databaseId: true, hash: true, id: true, name: true } } })
useCreateDatabaseGraphStoreMutation({ selection: { fields: { id: true } } })
useUpdateDatabaseGraphStoreMutation({ selection: { fields: { id: true } } })
useDeleteDatabaseGraphStoreMutation({})
```

## Examples

### List all databaseGraphStores

```typescript
const { data, isLoading } = useDatabaseGraphStoresQuery({
  selection: { fields: { createdAt: true, databaseId: true, hash: true, id: true, name: true } },
});
```

### Create a databaseGraphStore

```typescript
const { mutate } = useCreateDatabaseGraphStoreMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', hash: '<UUID>', name: '<String>' });
```
