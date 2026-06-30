# functionGraphExecutionOutput

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Content-addressed store for execution outputs — hash-referenced from node_outputs

## Usage

```typescript
useFunctionGraphExecutionOutputsQuery({ selection: { fields: { createdAt: true, id: true, databaseId: true, hash: true, data: true } } })
useFunctionGraphExecutionOutputQuery({ id: '<UUID>', selection: { fields: { createdAt: true, id: true, databaseId: true, hash: true, data: true } } })
useCreateFunctionGraphExecutionOutputMutation({ selection: { fields: { id: true } } })
useUpdateFunctionGraphExecutionOutputMutation({ selection: { fields: { id: true } } })
useDeleteFunctionGraphExecutionOutputMutation({})
```

## Examples

### List all functionGraphExecutionOutputs

```typescript
const { data, isLoading } = useFunctionGraphExecutionOutputsQuery({
  selection: { fields: { createdAt: true, id: true, databaseId: true, hash: true, data: true } },
});
```

### Create a functionGraphExecutionOutput

```typescript
const { mutate } = useCreateFunctionGraphExecutionOutputMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', hash: '<Base64EncodedBinary>', data: '<JSON>' });
```
