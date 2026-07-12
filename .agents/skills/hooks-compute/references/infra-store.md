# infraStore

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Named stores — one per version-controlled tree (e.g. one graph, one definition set)

## Usage

```typescript
useInfraStoresQuery({ selection: { fields: { id: true, name: true, scopeId: true, hash: true, createdAt: true } } })
useInfraStoreQuery({ id: '<UUID>', selection: { fields: { id: true, name: true, scopeId: true, hash: true, createdAt: true } } })
useCreateInfraStoreMutation({ selection: { fields: { id: true } } })
useUpdateInfraStoreMutation({ selection: { fields: { id: true } } })
useDeleteInfraStoreMutation({})
```

## Examples

### List all infraStores

```typescript
const { data, isLoading } = useInfraStoresQuery({
  selection: { fields: { id: true, name: true, scopeId: true, hash: true, createdAt: true } },
});
```

### Create a infraStore

```typescript
const { mutate } = useCreateInfraStoreMutation({
  selection: { fields: { id: true } },
});
mutate({ name: '<String>', scopeId: '<UUID>', hash: '<UUID>' });
```
