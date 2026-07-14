# functionGraphExecution

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Ephemeral execution state for flow graph evaluation

## Usage

```typescript
db.functionGraphExecution.findMany({ select: { id: true } }).execute()
db.functionGraphExecution.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.functionGraphExecution.create({ data: { completedAt: '<Datetime>', currentWave: '<Int>', definitionsCommitId: '<UUID>', errorCode: '<String>', errorMessage: '<String>', executionPlan: '<JSON>', graphId: '<UUID>', inputPayload: '<JSON>', invocationId: '<UUID>', lastProgressAt: '<Datetime>', maxPendingJobs: '<Int>', maxTicks: '<Int>', nodeOutputs: '<JSON>', outputNode: '<String>', outputPayload: '<JSON>', outputPort: '<String>', parentExecutionId: '<UUID>', parentNodeName: '<String>', scopeId: '<UUID>', startedAt: '<Datetime>', status: '<String>', tickCount: '<Int>', timeoutAt: '<Datetime>' }, select: { id: true } }).execute()
db.functionGraphExecution.update({ where: { id: '<UUID>' }, data: { completedAt: '<Datetime>' }, select: { id: true } }).execute()
db.functionGraphExecution.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all functionGraphExecution records

```typescript
const items = await db.functionGraphExecution.findMany({
  select: { id: true, completedAt: true }
}).execute();
```

### Create a functionGraphExecution

```typescript
const item = await db.functionGraphExecution.create({
  data: { completedAt: '<Datetime>', currentWave: '<Int>', definitionsCommitId: '<UUID>', errorCode: '<String>', errorMessage: '<String>', executionPlan: '<JSON>', graphId: '<UUID>', inputPayload: '<JSON>', invocationId: '<UUID>', lastProgressAt: '<Datetime>', maxPendingJobs: '<Int>', maxTicks: '<Int>', nodeOutputs: '<JSON>', outputNode: '<String>', outputPayload: '<JSON>', outputPort: '<String>', parentExecutionId: '<UUID>', parentNodeName: '<String>', scopeId: '<UUID>', startedAt: '<Datetime>', status: '<String>', tickCount: '<Int>', timeoutAt: '<Datetime>' },
  select: { id: true }
}).execute();
```
