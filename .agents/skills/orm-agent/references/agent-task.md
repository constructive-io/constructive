# agentTask

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Task within a plan, with ordering and optional approval gates

## Usage

```typescript
db.agentTask.findMany({ select: { id: true } }).execute()
db.agentTask.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.agentTask.create({ data: { actorId: '<UUID>', approvalFeedback: '<String>', approvalStatus: '<String>', approvedAt: '<Datetime>', approvedBy: '<UUID>', databaseId: '<UUID>', description: '<String>', error: '<String>', orderIndex: '<Int>', planId: '<UUID>', requiresApproval: '<Boolean>', source: '<String>', status: '<String>' }, select: { id: true } }).execute()
db.agentTask.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.agentTask.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all agentTask records

```typescript
const items = await db.agentTask.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a agentTask

```typescript
const item = await db.agentTask.create({
  data: { actorId: '<UUID>', approvalFeedback: '<String>', approvalStatus: '<String>', approvedAt: '<Datetime>', approvedBy: '<UUID>', databaseId: '<UUID>', description: '<String>', error: '<String>', orderIndex: '<Int>', planId: '<UUID>', requiresApproval: '<Boolean>', source: '<String>', status: '<String>' },
  select: { id: true }
}).execute();
```
