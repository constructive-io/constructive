# functionGraphRef

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Branch heads — mutable pointers into the commit chain

## Usage

```typescript
useFunctionGraphRefsQuery({ selection: { fields: { id: true, name: true, scopeId: true, storeId: true, commitId: true } } })
useFunctionGraphRefQuery({ id: '<UUID>', selection: { fields: { id: true, name: true, scopeId: true, storeId: true, commitId: true } } })
useCreateFunctionGraphRefMutation({ selection: { fields: { id: true } } })
useUpdateFunctionGraphRefMutation({ selection: { fields: { id: true } } })
useDeleteFunctionGraphRefMutation({})
```

## Examples

### List all functionGraphRefs

```typescript
const { data, isLoading } = useFunctionGraphRefsQuery({
  selection: { fields: { id: true, name: true, scopeId: true, storeId: true, commitId: true } },
});
```

### Create a functionGraphRef

```typescript
const { mutate } = useCreateFunctionGraphRefMutation({
  selection: { fields: { id: true } },
});
mutate({ name: '<String>', scopeId: '<UUID>', storeId: '<UUID>', commitId: '<UUID>' });
```
