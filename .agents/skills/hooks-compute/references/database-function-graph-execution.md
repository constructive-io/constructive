# databaseFunctionGraphExecution

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Ephemeral execution state for flow graph evaluation

## Usage

```typescript
useDatabaseFunctionGraphExecutionsQuery({ selection: { fields: { actorId: true, completedAt: true, currentWave: true, databaseId: true, definitionsCommitId: true, entityId: true, entityType: true, errorCode: true, errorMessage: true, executionPlan: true, graphId: true, id: true, inputPayload: true, invocationCreatedAt: true, invocationId: true, lastProgressAt: true, maxPendingJobs: true, maxTicks: true, nodeOutputs: true, organizationId: true, outputNames: true, outputNode: true, outputPayload: true, outputPort: true, parentExecutionId: true, parentInvocationId: true, parentNodeName: true, principalId: true, startedAt: true, status: true, tickCount: true, timeoutAt: true } } })
useDatabaseFunctionGraphExecutionQuery({ id: '<UUID>', selection: { fields: { actorId: true, completedAt: true, currentWave: true, databaseId: true, definitionsCommitId: true, entityId: true, entityType: true, errorCode: true, errorMessage: true, executionPlan: true, graphId: true, id: true, inputPayload: true, invocationCreatedAt: true, invocationId: true, lastProgressAt: true, maxPendingJobs: true, maxTicks: true, nodeOutputs: true, organizationId: true, outputNames: true, outputNode: true, outputPayload: true, outputPort: true, parentExecutionId: true, parentInvocationId: true, parentNodeName: true, principalId: true, startedAt: true, status: true, tickCount: true, timeoutAt: true } } })
useCreateDatabaseFunctionGraphExecutionMutation({ selection: { fields: { id: true } } })
useUpdateDatabaseFunctionGraphExecutionMutation({ selection: { fields: { id: true } } })
useDeleteDatabaseFunctionGraphExecutionMutation({})
```

## Examples

### List all databaseFunctionGraphExecutions

```typescript
const { data, isLoading } = useDatabaseFunctionGraphExecutionsQuery({
  selection: { fields: { actorId: true, completedAt: true, currentWave: true, databaseId: true, definitionsCommitId: true, entityId: true, entityType: true, errorCode: true, errorMessage: true, executionPlan: true, graphId: true, id: true, inputPayload: true, invocationCreatedAt: true, invocationId: true, lastProgressAt: true, maxPendingJobs: true, maxTicks: true, nodeOutputs: true, organizationId: true, outputNames: true, outputNode: true, outputPayload: true, outputPort: true, parentExecutionId: true, parentInvocationId: true, parentNodeName: true, principalId: true, startedAt: true, status: true, tickCount: true, timeoutAt: true } },
});
```

### Create a databaseFunctionGraphExecution

```typescript
const { mutate } = useCreateDatabaseFunctionGraphExecutionMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', completedAt: '<Datetime>', currentWave: '<Int>', databaseId: '<UUID>', definitionsCommitId: '<UUID>', entityId: '<UUID>', entityType: '<String>', errorCode: '<String>', errorMessage: '<String>', executionPlan: '<JSON>', graphId: '<UUID>', inputPayload: '<JSON>', invocationCreatedAt: '<Datetime>', invocationId: '<UUID>', lastProgressAt: '<Datetime>', maxPendingJobs: '<Int>', maxTicks: '<Int>', nodeOutputs: '<JSON>', organizationId: '<UUID>', outputNames: '<String>', outputNode: '<String>', outputPayload: '<JSON>', outputPort: '<String>', parentExecutionId: '<UUID>', parentInvocationId: '<UUID>', parentNodeName: '<String>', principalId: '<UUID>', startedAt: '<Datetime>', status: '<String>', tickCount: '<Int>', timeoutAt: '<Datetime>' });
```
