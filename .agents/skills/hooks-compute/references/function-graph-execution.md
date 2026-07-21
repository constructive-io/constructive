# functionGraphExecution

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Ephemeral execution state for flow graph evaluation

## Usage

```typescript
useFunctionGraphExecutionsQuery({ selection: { fields: { actorId: true, completedAt: true, currentWave: true, definitionsCommitId: true, entityId: true, entityType: true, errorCode: true, errorMessage: true, executionPlan: true, graphId: true, id: true, inputPayload: true, invocationCreatedAt: true, invocationId: true, lastProgressAt: true, maxPendingJobs: true, maxTicks: true, nodeOutputs: true, organizationId: true, outputNames: true, outputNode: true, outputPayload: true, outputPort: true, parentExecutionId: true, parentInvocationId: true, parentNodeName: true, principalId: true, scopeId: true, startedAt: true, status: true, tickCount: true, timeoutAt: true } } })
useFunctionGraphExecutionQuery({ id: '<UUID>', selection: { fields: { actorId: true, completedAt: true, currentWave: true, definitionsCommitId: true, entityId: true, entityType: true, errorCode: true, errorMessage: true, executionPlan: true, graphId: true, id: true, inputPayload: true, invocationCreatedAt: true, invocationId: true, lastProgressAt: true, maxPendingJobs: true, maxTicks: true, nodeOutputs: true, organizationId: true, outputNames: true, outputNode: true, outputPayload: true, outputPort: true, parentExecutionId: true, parentInvocationId: true, parentNodeName: true, principalId: true, scopeId: true, startedAt: true, status: true, tickCount: true, timeoutAt: true } } })
useCreateFunctionGraphExecutionMutation({ selection: { fields: { id: true } } })
useUpdateFunctionGraphExecutionMutation({ selection: { fields: { id: true } } })
useDeleteFunctionGraphExecutionMutation({})
```

## Examples

### List all functionGraphExecutions

```typescript
const { data, isLoading } = useFunctionGraphExecutionsQuery({
  selection: { fields: { actorId: true, completedAt: true, currentWave: true, definitionsCommitId: true, entityId: true, entityType: true, errorCode: true, errorMessage: true, executionPlan: true, graphId: true, id: true, inputPayload: true, invocationCreatedAt: true, invocationId: true, lastProgressAt: true, maxPendingJobs: true, maxTicks: true, nodeOutputs: true, organizationId: true, outputNames: true, outputNode: true, outputPayload: true, outputPort: true, parentExecutionId: true, parentInvocationId: true, parentNodeName: true, principalId: true, scopeId: true, startedAt: true, status: true, tickCount: true, timeoutAt: true } },
});
```

### Create a functionGraphExecution

```typescript
const { mutate } = useCreateFunctionGraphExecutionMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', completedAt: '<Datetime>', currentWave: '<Int>', definitionsCommitId: '<UUID>', entityId: '<UUID>', entityType: '<String>', errorCode: '<String>', errorMessage: '<String>', executionPlan: '<JSON>', graphId: '<UUID>', inputPayload: '<JSON>', invocationCreatedAt: '<Datetime>', invocationId: '<UUID>', lastProgressAt: '<Datetime>', maxPendingJobs: '<Int>', maxTicks: '<Int>', nodeOutputs: '<JSON>', organizationId: '<UUID>', outputNames: '<String>', outputNode: '<String>', outputPayload: '<JSON>', outputPort: '<String>', parentExecutionId: '<UUID>', parentInvocationId: '<UUID>', parentNodeName: '<String>', principalId: '<UUID>', scopeId: '<UUID>', startedAt: '<Datetime>', status: '<String>', tickCount: '<Int>', timeoutAt: '<Datetime>' });
```
