# functionGraphExecutionOutput

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Content-addressed store for execution outputs — hash-referenced from node_outputs

## Usage

```typescript
useFunctionGraphExecutionOutputsQuery({ selection: { fields: { createdAt: true, data: true, hash: true, id: true, scopeId: true } } })
useFunctionGraphExecutionOutputQuery({ id: '<UUID>', selection: { fields: { createdAt: true, data: true, hash: true, id: true, scopeId: true } } })
useCreateFunctionGraphExecutionOutputMutation({ selection: { fields: { id: true } } })
useUpdateFunctionGraphExecutionOutputMutation({ selection: { fields: { id: true } } })
useDeleteFunctionGraphExecutionOutputMutation({})
```

## Examples

### List all functionGraphExecutionOutputs

```typescript
const { data, isLoading } = useFunctionGraphExecutionOutputsQuery({
  selection: { fields: { createdAt: true, data: true, hash: true, id: true, scopeId: true } },
});
```

### Create a functionGraphExecutionOutput

```typescript
const { mutate } = useCreateFunctionGraphExecutionOutputMutation({
  selection: { fields: { id: true } },
});
mutate({ data: '<JSON>', hash: '<Base64EncodedBinary>', scopeId: '<UUID>' });
```
