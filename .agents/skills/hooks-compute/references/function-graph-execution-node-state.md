# functionGraphExecutionNodeState

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-node execution state — tracks individual node lifecycle for debugging

## Usage

```typescript
useFunctionGraphExecutionNodeStatesQuery({ selection: { fields: { createdAt: true, id: true, executionId: true, scopeId: true, nodeName: true, nodePath: true, status: true, startedAt: true, completedAt: true, errorCode: true, errorMessage: true, outputId: true } } })
useFunctionGraphExecutionNodeStateQuery({ id: '<UUID>', selection: { fields: { createdAt: true, id: true, executionId: true, scopeId: true, nodeName: true, nodePath: true, status: true, startedAt: true, completedAt: true, errorCode: true, errorMessage: true, outputId: true } } })
useCreateFunctionGraphExecutionNodeStateMutation({ selection: { fields: { id: true } } })
useUpdateFunctionGraphExecutionNodeStateMutation({ selection: { fields: { id: true } } })
useDeleteFunctionGraphExecutionNodeStateMutation({})
```

## Examples

### List all functionGraphExecutionNodeStates

```typescript
const { data, isLoading } = useFunctionGraphExecutionNodeStatesQuery({
  selection: { fields: { createdAt: true, id: true, executionId: true, scopeId: true, nodeName: true, nodePath: true, status: true, startedAt: true, completedAt: true, errorCode: true, errorMessage: true, outputId: true } },
});
```

### Create a functionGraphExecutionNodeState

```typescript
const { mutate } = useCreateFunctionGraphExecutionNodeStateMutation({
  selection: { fields: { id: true } },
});
mutate({ executionId: '<UUID>', scopeId: '<UUID>', nodeName: '<String>', nodePath: '<String>', status: '<String>', startedAt: '<Datetime>', completedAt: '<Datetime>', errorCode: '<String>', errorMessage: '<String>', outputId: '<UUID>' });
```
