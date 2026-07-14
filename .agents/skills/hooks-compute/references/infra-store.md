# infraStore

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Named stores — one per version-controlled tree (e.g. one graph, one definition set)

## Usage

```typescript
useInfraStoresQuery({ selection: { fields: { createdAt: true, hash: true, id: true, name: true, scopeId: true } } })
useInfraStoreQuery({ id: '<UUID>', selection: { fields: { createdAt: true, hash: true, id: true, name: true, scopeId: true } } })
useCreateInfraStoreMutation({ selection: { fields: { id: true } } })
useUpdateInfraStoreMutation({ selection: { fields: { id: true } } })
useDeleteInfraStoreMutation({})
```

## Examples

### List all infraStores

```typescript
const { data, isLoading } = useInfraStoresQuery({
  selection: { fields: { createdAt: true, hash: true, id: true, name: true, scopeId: true } },
});
```

### Create a infraStore

```typescript
const { mutate } = useCreateInfraStoreMutation({
  selection: { fields: { id: true } },
});
mutate({ hash: '<UUID>', name: '<String>', scopeId: '<UUID>' });
```
