# functionGraphExecution

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Ephemeral execution state for flow graph evaluation

## Usage

```typescript
useFunctionGraphExecutionsQuery({ selection: { fields: { completedAt: true, currentWave: true, definitionsCommitId: true, errorCode: true, errorMessage: true, executionPlan: true, graphId: true, id: true, inputPayload: true, invocationId: true, lastProgressAt: true, maxPendingJobs: true, maxTicks: true, nodeOutputs: true, outputNode: true, outputPayload: true, outputPort: true, parentExecutionId: true, parentNodeName: true, scopeId: true, startedAt: true, status: true, tickCount: true, timeoutAt: true } } })
useFunctionGraphExecutionQuery({ id: '<UUID>', selection: { fields: { completedAt: true, currentWave: true, definitionsCommitId: true, errorCode: true, errorMessage: true, executionPlan: true, graphId: true, id: true, inputPayload: true, invocationId: true, lastProgressAt: true, maxPendingJobs: true, maxTicks: true, nodeOutputs: true, outputNode: true, outputPayload: true, outputPort: true, parentExecutionId: true, parentNodeName: true, scopeId: true, startedAt: true, status: true, tickCount: true, timeoutAt: true } } })
useCreateFunctionGraphExecutionMutation({ selection: { fields: { id: true } } })
useUpdateFunctionGraphExecutionMutation({ selection: { fields: { id: true } } })
useDeleteFunctionGraphExecutionMutation({})
```

## Examples

### List all functionGraphExecutions

```typescript
const { data, isLoading } = useFunctionGraphExecutionsQuery({
  selection: { fields: { completedAt: true, currentWave: true, definitionsCommitId: true, errorCode: true, errorMessage: true, executionPlan: true, graphId: true, id: true, inputPayload: true, invocationId: true, lastProgressAt: true, maxPendingJobs: true, maxTicks: true, nodeOutputs: true, outputNode: true, outputPayload: true, outputPort: true, parentExecutionId: true, parentNodeName: true, scopeId: true, startedAt: true, status: true, tickCount: true, timeoutAt: true } },
});
```

### Create a functionGraphExecution

```typescript
const { mutate } = useCreateFunctionGraphExecutionMutation({
  selection: { fields: { id: true } },
});
mutate({ completedAt: '<Datetime>', currentWave: '<Int>', definitionsCommitId: '<UUID>', errorCode: '<String>', errorMessage: '<String>', executionPlan: '<JSON>', graphId: '<UUID>', inputPayload: '<JSON>', invocationId: '<UUID>', lastProgressAt: '<Datetime>', maxPendingJobs: '<Int>', maxTicks: '<Int>', nodeOutputs: '<JSON>', outputNode: '<String>', outputPayload: '<JSON>', outputPort: '<String>', parentExecutionId: '<UUID>', parentNodeName: '<String>', scopeId: '<UUID>', startedAt: '<Datetime>', status: '<String>', tickCount: '<Int>', timeoutAt: '<Datetime>' });
```
