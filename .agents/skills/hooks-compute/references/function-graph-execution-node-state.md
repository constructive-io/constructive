# functionGraphExecutionNodeState

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-node execution state — tracks individual node lifecycle for debugging

## Usage

```typescript
useFunctionGraphExecutionNodeStatesQuery({ selection: { fields: { callbackInputs: true, callbackMeta: true, callbackTokenHash: true, completedAt: true, createdAt: true, errorCode: true, errorMessage: true, executionId: true, expiryDefaultOutput: true, expiryEscalatedAt: true, expiryPolicy: true, id: true, nodeName: true, nodePath: true, outputId: true, scopeId: true, startedAt: true, status: true, waitingDeadlineAt: true, waitingOn: true, waitingSince: true } } })
useFunctionGraphExecutionNodeStateQuery({ id: '<UUID>', selection: { fields: { callbackInputs: true, callbackMeta: true, callbackTokenHash: true, completedAt: true, createdAt: true, errorCode: true, errorMessage: true, executionId: true, expiryDefaultOutput: true, expiryEscalatedAt: true, expiryPolicy: true, id: true, nodeName: true, nodePath: true, outputId: true, scopeId: true, startedAt: true, status: true, waitingDeadlineAt: true, waitingOn: true, waitingSince: true } } })
useCreateFunctionGraphExecutionNodeStateMutation({ selection: { fields: { id: true } } })
useUpdateFunctionGraphExecutionNodeStateMutation({ selection: { fields: { id: true } } })
useDeleteFunctionGraphExecutionNodeStateMutation({})
```

## Examples

### List all functionGraphExecutionNodeStates

```typescript
const { data, isLoading } = useFunctionGraphExecutionNodeStatesQuery({
  selection: { fields: { callbackInputs: true, callbackMeta: true, callbackTokenHash: true, completedAt: true, createdAt: true, errorCode: true, errorMessage: true, executionId: true, expiryDefaultOutput: true, expiryEscalatedAt: true, expiryPolicy: true, id: true, nodeName: true, nodePath: true, outputId: true, scopeId: true, startedAt: true, status: true, waitingDeadlineAt: true, waitingOn: true, waitingSince: true } },
});
```

### Create a functionGraphExecutionNodeState

```typescript
const { mutate } = useCreateFunctionGraphExecutionNodeStateMutation({
  selection: { fields: { id: true } },
});
mutate({ callbackInputs: '<JSON>', callbackMeta: '<JSON>', callbackTokenHash: '<String>', completedAt: '<Datetime>', errorCode: '<String>', errorMessage: '<String>', executionId: '<UUID>', expiryDefaultOutput: '<JSON>', expiryEscalatedAt: '<Datetime>', expiryPolicy: '<String>', nodeName: '<String>', nodePath: '<String>', outputId: '<UUID>', scopeId: '<UUID>', startedAt: '<Datetime>', status: '<String>', waitingDeadlineAt: '<Datetime>', waitingOn: '<String>', waitingSince: '<Datetime>' });
```
