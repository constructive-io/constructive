# functionGraphExecution

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Ephemeral execution state for flow graph evaluation

## Usage

```typescript
useFunctionGraphExecutionsQuery({ selection: { fields: { startedAt: true, id: true, graphId: true, invocationId: true, databaseId: true, entityId: true, outputNode: true, outputPort: true, status: true, inputPayload: true, outputPayload: true, nodeOutputs: true, executionPlan: true, currentWave: true, parentExecutionId: true, parentNodeName: true, definitionsCommitId: true, tickCount: true, completedAt: true, maxTicks: true, maxPendingJobs: true, timeoutAt: true, errorCode: true, errorMessage: true } } })
useFunctionGraphExecutionQuery({ id: '<UUID>', selection: { fields: { startedAt: true, id: true, graphId: true, invocationId: true, databaseId: true, entityId: true, outputNode: true, outputPort: true, status: true, inputPayload: true, outputPayload: true, nodeOutputs: true, executionPlan: true, currentWave: true, parentExecutionId: true, parentNodeName: true, definitionsCommitId: true, tickCount: true, completedAt: true, maxTicks: true, maxPendingJobs: true, timeoutAt: true, errorCode: true, errorMessage: true } } })
useCreateFunctionGraphExecutionMutation({ selection: { fields: { id: true } } })
useUpdateFunctionGraphExecutionMutation({ selection: { fields: { id: true } } })
useDeleteFunctionGraphExecutionMutation({})
```

## Examples

### List all functionGraphExecutions

```typescript
const { data, isLoading } = useFunctionGraphExecutionsQuery({
  selection: { fields: { startedAt: true, id: true, graphId: true, invocationId: true, databaseId: true, entityId: true, outputNode: true, outputPort: true, status: true, inputPayload: true, outputPayload: true, nodeOutputs: true, executionPlan: true, currentWave: true, parentExecutionId: true, parentNodeName: true, definitionsCommitId: true, tickCount: true, completedAt: true, maxTicks: true, maxPendingJobs: true, timeoutAt: true, errorCode: true, errorMessage: true } },
});
```

### Create a functionGraphExecution

```typescript
const { mutate } = useCreateFunctionGraphExecutionMutation({
  selection: { fields: { id: true } },
});
mutate({ startedAt: '<Datetime>', graphId: '<UUID>', invocationId: '<UUID>', databaseId: '<UUID>', entityId: '<UUID>', outputNode: '<String>', outputPort: '<String>', status: '<String>', inputPayload: '<JSON>', outputPayload: '<JSON>', nodeOutputs: '<JSON>', executionPlan: '<JSON>', currentWave: '<Int>', parentExecutionId: '<UUID>', parentNodeName: '<String>', definitionsCommitId: '<UUID>', tickCount: '<Int>', completedAt: '<Datetime>', maxTicks: '<Int>', maxPendingJobs: '<Int>', timeoutAt: '<Datetime>', errorCode: '<String>', errorMessage: '<String>' });
```
