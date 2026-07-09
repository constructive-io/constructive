# functionGraphExecution

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Ephemeral execution state for flow graph evaluation

## Usage

```typescript
db.functionGraphExecution.findMany({ select: { id: true } }).execute()
db.functionGraphExecution.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.functionGraphExecution.create({ data: { startedAt: '<Datetime>', graphId: '<UUID>', invocationId: '<UUID>', databaseId: '<UUID>', outputNode: '<String>', outputPort: '<String>', status: '<String>', inputPayload: '<JSON>', outputPayload: '<JSON>', nodeOutputs: '<JSON>', executionPlan: '<JSON>', currentWave: '<Int>', parentExecutionId: '<UUID>', parentNodeName: '<String>', definitionsCommitId: '<UUID>', tickCount: '<Int>', completedAt: '<Datetime>', maxTicks: '<Int>', maxPendingJobs: '<Int>', timeoutAt: '<Datetime>', errorCode: '<String>', errorMessage: '<String>' }, select: { id: true } }).execute()
db.functionGraphExecution.update({ where: { id: '<UUID>' }, data: { startedAt: '<Datetime>' }, select: { id: true } }).execute()
db.functionGraphExecution.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all functionGraphExecution records

```typescript
const items = await db.functionGraphExecution.findMany({
  select: { id: true, startedAt: true }
}).execute();
```

### Create a functionGraphExecution

```typescript
const item = await db.functionGraphExecution.create({
  data: { startedAt: '<Datetime>', graphId: '<UUID>', invocationId: '<UUID>', databaseId: '<UUID>', outputNode: '<String>', outputPort: '<String>', status: '<String>', inputPayload: '<JSON>', outputPayload: '<JSON>', nodeOutputs: '<JSON>', executionPlan: '<JSON>', currentWave: '<Int>', parentExecutionId: '<UUID>', parentNodeName: '<String>', definitionsCommitId: '<UUID>', tickCount: '<Int>', completedAt: '<Datetime>', maxTicks: '<Int>', maxPendingJobs: '<Int>', timeoutAt: '<Datetime>', errorCode: '<String>', errorMessage: '<String>' },
  select: { id: true }
}).execute();
```
