# agentPrompt

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Shared system prompt templates for agent conversations

## Usage

```typescript
db.agentPrompt.findMany({ select: { id: true } }).execute()
db.agentPrompt.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.agentPrompt.create({ data: { content: '<String>', createdBy: '<UUID>', databaseId: '<UUID>', description: '<String>', isDefault: '<Boolean>', metadata: '<JSON>', name: '<String>', updatedBy: '<UUID>' }, select: { id: true } }).execute()
db.agentPrompt.update({ where: { id: '<UUID>' }, data: { content: '<String>' }, select: { id: true } }).execute()
db.agentPrompt.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all agentPrompt records

```typescript
const items = await db.agentPrompt.findMany({
  select: { id: true, content: true }
}).execute();
```

### Create a agentPrompt

```typescript
const item = await db.agentPrompt.create({
  data: { content: '<String>', createdBy: '<UUID>', databaseId: '<UUID>', description: '<String>', isDefault: '<Boolean>', metadata: '<JSON>', name: '<String>', updatedBy: '<UUID>' },
  select: { id: true }
}).execute();
```
