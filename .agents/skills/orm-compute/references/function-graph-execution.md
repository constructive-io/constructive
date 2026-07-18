# functionGraphExecution

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Ephemeral execution state for flow graph evaluation

## Usage

```typescript
db.functionGraphExecution.findMany({ select: { id: true } }).execute()
db.functionGraphExecution.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.functionGraphExecution.create({ data: { actorId: '<UUID>', completedAt: '<Datetime>', currentWave: '<Int>', definitionsCommitId: '<UUID>', entityId: '<UUID>', entityType: '<String>', errorCode: '<String>', errorMessage: '<String>', executionPlan: '<JSON>', graphId: '<UUID>', inputPayload: '<JSON>', invocationCreatedAt: '<Datetime>', invocationId: '<UUID>', lastProgressAt: '<Datetime>', maxPendingJobs: '<Int>', maxTicks: '<Int>', nodeOutputs: '<JSON>', organizationId: '<UUID>', outputNames: '<String>', outputNode: '<String>', outputPayload: '<JSON>', outputPort: '<String>', parentExecutionId: '<UUID>', parentInvocationId: '<UUID>', parentNodeName: '<String>', principalId: '<UUID>', scopeId: '<UUID>', startedAt: '<Datetime>', status: '<String>', tickCount: '<Int>', timeoutAt: '<Datetime>' }, select: { id: true } }).execute()
db.functionGraphExecution.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.functionGraphExecution.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all functionGraphExecution records

```typescript
const items = await db.functionGraphExecution.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a functionGraphExecution

```typescript
const item = await db.functionGraphExecution.create({
  data: { actorId: '<UUID>', completedAt: '<Datetime>', currentWave: '<Int>', definitionsCommitId: '<UUID>', entityId: '<UUID>', entityType: '<String>', errorCode: '<String>', errorMessage: '<String>', executionPlan: '<JSON>', graphId: '<UUID>', inputPayload: '<JSON>', invocationCreatedAt: '<Datetime>', invocationId: '<UUID>', lastProgressAt: '<Datetime>', maxPendingJobs: '<Int>', maxTicks: '<Int>', nodeOutputs: '<JSON>', organizationId: '<UUID>', outputNames: '<String>', outputNode: '<String>', outputPayload: '<JSON>', outputPort: '<String>', parentExecutionId: '<UUID>', parentInvocationId: '<UUID>', parentNodeName: '<String>', principalId: '<UUID>', scopeId: '<UUID>', startedAt: '<Datetime>', status: '<String>', tickCount: '<Int>', timeoutAt: '<Datetime>' },
  select: { id: true }
}).execute();
```
