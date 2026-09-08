# platformAgentPlan

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Workflow plan attached to an agent thread with ordered tasks and optional approval gates

## Usage

```typescript
db.platformAgentPlan.findMany({ select: { id: true } }).execute()
db.platformAgentPlan.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformAgentPlan.create({ data: { description: '<String>', ownerId: '<UUID>', status: '<String>', threadId: '<UUID>', title: '<String>', visibility: '<String>' }, select: { id: true } }).execute()
db.platformAgentPlan.update({ where: { id: '<UUID>' }, data: { description: '<String>' }, select: { id: true } }).execute()
db.platformAgentPlan.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformAgentPlan records

```typescript
const items = await db.platformAgentPlan.findMany({
  select: { id: true, description: true }
}).execute();
```

### Create a platformAgentPlan

```typescript
const item = await db.platformAgentPlan.create({
  data: { description: '<String>', ownerId: '<UUID>', status: '<String>', threadId: '<UUID>', title: '<String>', visibility: '<String>' },
  select: { id: true }
}).execute();
```
