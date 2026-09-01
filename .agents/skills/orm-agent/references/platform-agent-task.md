# platformAgentTask

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Task within a plan, with ordering and optional approval gates

## Usage

```typescript
db.platformAgentTask.findMany({ select: { id: true } }).execute()
db.platformAgentTask.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformAgentTask.create({ data: { actorId: '<UUID>', approvalFeedback: '<String>', approvalStatus: '<String>', approvedAt: '<Datetime>', approvedBy: '<UUID>', description: '<String>', error: '<String>', orderIndex: '<Int>', planId: '<UUID>', requiresApproval: '<Boolean>', source: '<String>', status: '<String>', visibility: '<String>' }, select: { id: true } }).execute()
db.platformAgentTask.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.platformAgentTask.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformAgentTask records

```typescript
const items = await db.platformAgentTask.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a platformAgentTask

```typescript
const item = await db.platformAgentTask.create({
  data: { actorId: '<UUID>', approvalFeedback: '<String>', approvalStatus: '<String>', approvedAt: '<Datetime>', approvedBy: '<UUID>', description: '<String>', error: '<String>', orderIndex: '<Int>', planId: '<UUID>', requiresApproval: '<Boolean>', source: '<String>', status: '<String>', visibility: '<String>' },
  select: { id: true }
}).execute();
```
