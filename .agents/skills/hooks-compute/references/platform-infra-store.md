# platformInfraStore

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Named stores — one per version-controlled tree (e.g. one graph, one definition set)

## Usage

```typescript
usePlatformInfraStoresQuery({ selection: { fields: { createdAt: true, hash: true, id: true, name: true, scopeId: true } } })
usePlatformInfraStoreQuery({ id: '<UUID>', selection: { fields: { createdAt: true, hash: true, id: true, name: true, scopeId: true } } })
useCreatePlatformInfraStoreMutation({ selection: { fields: { id: true } } })
useUpdatePlatformInfraStoreMutation({ selection: { fields: { id: true } } })
useDeletePlatformInfraStoreMutation({})
```

## Examples

### List all platformInfraStores

```typescript
const { data, isLoading } = usePlatformInfraStoresQuery({
  selection: { fields: { createdAt: true, hash: true, id: true, name: true, scopeId: true } },
});
```

### Create a platformInfraStore

```typescript
const { mutate } = useCreatePlatformInfraStoreMutation({
  selection: { fields: { id: true } },
});
mutate({ hash: '<UUID>', name: '<String>', scopeId: '<UUID>' });
```
