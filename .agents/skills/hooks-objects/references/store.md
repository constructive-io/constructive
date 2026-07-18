# store

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Named stores — one per version-controlled tree (e.g. one graph, one definition set)

## Usage

```typescript
useStoresQuery({ selection: { fields: { createdAt: true, databaseId: true, hash: true, id: true, name: true } } })
useStoreQuery({ id: '<UUID>', selection: { fields: { createdAt: true, databaseId: true, hash: true, id: true, name: true } } })
useCreateStoreMutation({ selection: { fields: { id: true } } })
useUpdateStoreMutation({ selection: { fields: { id: true } } })
useDeleteStoreMutation({})
```

## Examples

### List all stores

```typescript
const { data, isLoading } = useStoresQuery({
  selection: { fields: { createdAt: true, databaseId: true, hash: true, id: true, name: true } },
});
```

### Create a store

```typescript
const { mutate } = useCreateStoreMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', hash: '<UUID>', name: '<String>' });
```
