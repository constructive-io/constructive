# agentPlan

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Workflow plan attached to an agent thread with ordered tasks and optional approval gates

## Usage

```typescript
db.agentPlan.findMany({ select: { id: true } }).execute()
db.agentPlan.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.agentPlan.create({ data: { databaseId: '<UUID>', description: '<String>', ownerId: '<UUID>', status: '<String>', threadId: '<UUID>', title: '<String>' }, select: { id: true } }).execute()
db.agentPlan.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.agentPlan.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all agentPlan records

```typescript
const items = await db.agentPlan.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a agentPlan

```typescript
const item = await db.agentPlan.create({
  data: { databaseId: '<UUID>', description: '<String>', ownerId: '<UUID>', status: '<String>', threadId: '<UUID>', title: '<String>' },
  select: { id: true }
}).execute();
```
