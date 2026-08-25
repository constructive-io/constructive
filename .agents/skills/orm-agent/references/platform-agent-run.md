# platformAgentRun

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

One supervised agent run of a thread: its placement, workspace, cursor and artifacts

## Usage

```typescript
db.platformAgentRun.findMany({ select: { id: true } }).execute()
db.platformAgentRun.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformAgentRun.create({ data: { actorId: '<UUID>', artifacts: '<JSON>', attempt: '<Int>', baseCommit: '<String>', branch: '<String>', databaseId: '<UUID>', deadlineAt: '<Datetime>', entityId: '<UUID>', error: '<String>', executionId: '<UUID>', finishedAt: '<Datetime>', headCommit: '<String>', lastEventSeq: '<Int>', parentRunId: '<UUID>', placement: '<String>', principalId: '<UUID>', repoUrl: '<String>', startedAt: '<Datetime>', status: '<String>', threadId: '<UUID>', tokenUsage: '<JSON>', totalCost: '<BigFloat>', visibility: '<String>' }, select: { id: true } }).execute()
db.platformAgentRun.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.platformAgentRun.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformAgentRun records

```typescript
const items = await db.platformAgentRun.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a platformAgentRun

```typescript
const item = await db.platformAgentRun.create({
  data: { actorId: '<UUID>', artifacts: '<JSON>', attempt: '<Int>', baseCommit: '<String>', branch: '<String>', databaseId: '<UUID>', deadlineAt: '<Datetime>', entityId: '<UUID>', error: '<String>', executionId: '<UUID>', finishedAt: '<Datetime>', headCommit: '<String>', lastEventSeq: '<Int>', parentRunId: '<UUID>', placement: '<String>', principalId: '<UUID>', repoUrl: '<String>', startedAt: '<Datetime>', status: '<String>', threadId: '<UUID>', tokenUsage: '<JSON>', totalCost: '<BigFloat>', visibility: '<String>' },
  select: { id: true }
}).execute();
```
