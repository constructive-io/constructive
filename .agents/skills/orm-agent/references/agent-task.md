# agentTask

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Task within a plan, with ordering and optional approval gates

## Usage

```typescript
db.agentTask.findMany({ select: { id: true } }).execute()
db.agentTask.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.agentTask.create({ data: { ownerId: '<UUID>', status: '<String>', planId: '<UUID>', description: '<String>', source: '<String>', error: '<String>', orderIndex: '<Int>', requiresApproval: '<Boolean>', approvalStatus: '<String>', approvedBy: '<UUID>', approvedAt: '<Datetime>', approvalFeedback: '<String>' }, select: { id: true } }).execute()
db.agentTask.update({ where: { id: '<UUID>' }, data: { ownerId: '<UUID>' }, select: { id: true } }).execute()
db.agentTask.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all agentTask records

```typescript
const items = await db.agentTask.findMany({
  select: { id: true, ownerId: true }
}).execute();
```

### Create a agentTask

```typescript
const item = await db.agentTask.create({
  data: { ownerId: '<UUID>', status: '<String>', planId: '<UUID>', description: '<String>', source: '<String>', error: '<String>', orderIndex: '<Int>', requiresApproval: '<Boolean>', approvalStatus: '<String>', approvedBy: '<UUID>', approvedAt: '<Datetime>', approvalFeedback: '<String>' },
  select: { id: true }
}).execute();
```
