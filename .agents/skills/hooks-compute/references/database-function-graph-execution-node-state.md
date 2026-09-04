# databaseFunctionGraphExecutionNodeState

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-node execution state — tracks individual node lifecycle for debugging

## Usage

```typescript
useDatabaseFunctionGraphExecutionNodeStatesQuery({ selection: { fields: { callbackInputs: true, callbackMeta: true, callbackTokenHash: true, completedAt: true, createdAt: true, databaseId: true, errorCode: true, errorMessage: true, executionId: true, expiryDefaultOutput: true, expiryEscalatedAt: true, expiryPolicy: true, id: true, nodeName: true, nodePath: true, outputId: true, startedAt: true, status: true, waitingDeadlineAt: true, waitingOn: true, waitingSince: true } } })
useDatabaseFunctionGraphExecutionNodeStateQuery({ id: '<UUID>', selection: { fields: { callbackInputs: true, callbackMeta: true, callbackTokenHash: true, completedAt: true, createdAt: true, databaseId: true, errorCode: true, errorMessage: true, executionId: true, expiryDefaultOutput: true, expiryEscalatedAt: true, expiryPolicy: true, id: true, nodeName: true, nodePath: true, outputId: true, startedAt: true, status: true, waitingDeadlineAt: true, waitingOn: true, waitingSince: true } } })
useCreateDatabaseFunctionGraphExecutionNodeStateMutation({ selection: { fields: { id: true } } })
useUpdateDatabaseFunctionGraphExecutionNodeStateMutation({ selection: { fields: { id: true } } })
useDeleteDatabaseFunctionGraphExecutionNodeStateMutation({})
```

## Examples

### List all databaseFunctionGraphExecutionNodeStates

```typescript
const { data, isLoading } = useDatabaseFunctionGraphExecutionNodeStatesQuery({
  selection: { fields: { callbackInputs: true, callbackMeta: true, callbackTokenHash: true, completedAt: true, createdAt: true, databaseId: true, errorCode: true, errorMessage: true, executionId: true, expiryDefaultOutput: true, expiryEscalatedAt: true, expiryPolicy: true, id: true, nodeName: true, nodePath: true, outputId: true, startedAt: true, status: true, waitingDeadlineAt: true, waitingOn: true, waitingSince: true } },
});
```

### Create a databaseFunctionGraphExecutionNodeState

```typescript
const { mutate } = useCreateDatabaseFunctionGraphExecutionNodeStateMutation({
  selection: { fields: { id: true } },
});
mutate({ callbackInputs: '<JSON>', callbackMeta: '<JSON>', callbackTokenHash: '<String>', completedAt: '<Datetime>', databaseId: '<UUID>', errorCode: '<String>', errorMessage: '<String>', executionId: '<UUID>', expiryDefaultOutput: '<JSON>', expiryEscalatedAt: '<Datetime>', expiryPolicy: '<String>', nodeName: '<String>', nodePath: '<String>', outputId: '<UUID>', startedAt: '<Datetime>', status: '<String>', waitingDeadlineAt: '<Datetime>', waitingOn: '<String>', waitingSince: '<Datetime>' });
```
