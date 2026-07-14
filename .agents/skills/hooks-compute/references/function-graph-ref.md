# functionGraphRef

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Branch heads — mutable pointers into the commit chain

## Usage

```typescript
useFunctionGraphRefsQuery({ selection: { fields: { commitId: true, id: true, name: true, scopeId: true, storeId: true } } })
useFunctionGraphRefQuery({ id: '<UUID>', selection: { fields: { commitId: true, id: true, name: true, scopeId: true, storeId: true } } })
useCreateFunctionGraphRefMutation({ selection: { fields: { id: true } } })
useUpdateFunctionGraphRefMutation({ selection: { fields: { id: true } } })
useDeleteFunctionGraphRefMutation({})
```

## Examples

### List all functionGraphRefs

```typescript
const { data, isLoading } = useFunctionGraphRefsQuery({
  selection: { fields: { commitId: true, id: true, name: true, scopeId: true, storeId: true } },
});
```

### Create a functionGraphRef

```typescript
const { mutate } = useCreateFunctionGraphRefMutation({
  selection: { fields: { id: true } },
});
mutate({ commitId: '<UUID>', name: '<String>', scopeId: '<UUID>', storeId: '<UUID>' });
```
