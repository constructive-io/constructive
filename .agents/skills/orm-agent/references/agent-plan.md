# agentPlan

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Workflow plan attached to an agent thread with ordered tasks and optional approval gates

## Usage

```typescript
db.agentPlan.findMany({ select: { id: true } }).execute()
db.agentPlan.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.agentPlan.create({ data: { ownerId: '<UUID>', threadId: '<UUID>', title: '<String>', description: '<String>', status: '<String>' }, select: { id: true } }).execute()
db.agentPlan.update({ where: { id: '<UUID>' }, data: { ownerId: '<UUID>' }, select: { id: true } }).execute()
db.agentPlan.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all agentPlan records

```typescript
const items = await db.agentPlan.findMany({
  select: { id: true, ownerId: true }
}).execute();
```

### Create a agentPlan

```typescript
const item = await db.agentPlan.create({
  data: { ownerId: '<UUID>', threadId: '<UUID>', title: '<String>', description: '<String>', status: '<String>' },
  select: { id: true }
}).execute();
```
