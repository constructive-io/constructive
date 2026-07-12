# agentPrompt

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Shared system prompt templates for agent conversations

## Usage

```typescript
db.agentPrompt.findMany({ select: { id: true } }).execute()
db.agentPrompt.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.agentPrompt.create({ data: { createdBy: '<UUID>', updatedBy: '<UUID>', databaseId: '<UUID>', name: '<String>', content: '<String>', description: '<String>', isDefault: '<Boolean>', metadata: '<JSON>' }, select: { id: true } }).execute()
db.agentPrompt.update({ where: { id: '<UUID>' }, data: { createdBy: '<UUID>' }, select: { id: true } }).execute()
db.agentPrompt.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all agentPrompt records

```typescript
const items = await db.agentPrompt.findMany({
  select: { id: true, createdBy: true }
}).execute();
```

### Create a agentPrompt

```typescript
const item = await db.agentPrompt.create({
  data: { createdBy: '<UUID>', updatedBy: '<UUID>', databaseId: '<UUID>', name: '<String>', content: '<String>', description: '<String>', isDefault: '<Boolean>', metadata: '<JSON>' },
  select: { id: true }
}).execute();
```
