# functionGraphStore

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Named stores — one per version-controlled tree (e.g. one graph, one definition set)

## Usage

```typescript
useFunctionGraphStoresQuery({ selection: { fields: { createdAt: true, hash: true, id: true, name: true, scopeId: true } } })
useFunctionGraphStoreQuery({ id: '<UUID>', selection: { fields: { createdAt: true, hash: true, id: true, name: true, scopeId: true } } })
useCreateFunctionGraphStoreMutation({ selection: { fields: { id: true } } })
useUpdateFunctionGraphStoreMutation({ selection: { fields: { id: true } } })
useDeleteFunctionGraphStoreMutation({})
```

## Examples

### List all functionGraphStores

```typescript
const { data, isLoading } = useFunctionGraphStoresQuery({
  selection: { fields: { createdAt: true, hash: true, id: true, name: true, scopeId: true } },
});
```

### Create a functionGraphStore

```typescript
const { mutate } = useCreateFunctionGraphStoreMutation({
  selection: { fields: { id: true } },
});
mutate({ hash: '<UUID>', name: '<String>', scopeId: '<UUID>' });
```
