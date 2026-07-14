# functionGraphExecutionNodeState

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-node execution state — tracks individual node lifecycle for debugging

## Usage

```typescript
useFunctionGraphExecutionNodeStatesQuery({ selection: { fields: { completedAt: true, createdAt: true, errorCode: true, errorMessage: true, executionId: true, id: true, nodeName: true, nodePath: true, outputId: true, scopeId: true, startedAt: true, status: true } } })
useFunctionGraphExecutionNodeStateQuery({ id: '<UUID>', selection: { fields: { completedAt: true, createdAt: true, errorCode: true, errorMessage: true, executionId: true, id: true, nodeName: true, nodePath: true, outputId: true, scopeId: true, startedAt: true, status: true } } })
useCreateFunctionGraphExecutionNodeStateMutation({ selection: { fields: { id: true } } })
useUpdateFunctionGraphExecutionNodeStateMutation({ selection: { fields: { id: true } } })
useDeleteFunctionGraphExecutionNodeStateMutation({})
```

## Examples

### List all functionGraphExecutionNodeStates

```typescript
const { data, isLoading } = useFunctionGraphExecutionNodeStatesQuery({
  selection: { fields: { completedAt: true, createdAt: true, errorCode: true, errorMessage: true, executionId: true, id: true, nodeName: true, nodePath: true, outputId: true, scopeId: true, startedAt: true, status: true } },
});
```

### Create a functionGraphExecutionNodeState

```typescript
const { mutate } = useCreateFunctionGraphExecutionNodeStateMutation({
  selection: { fields: { id: true } },
});
mutate({ completedAt: '<Datetime>', errorCode: '<String>', errorMessage: '<String>', executionId: '<UUID>', nodeName: '<String>', nodePath: '<String>', outputId: '<UUID>', scopeId: '<UUID>', startedAt: '<Datetime>', status: '<String>' });
```
