# agentThread

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Top-level AI/LLM conversation thread

## Usage

```typescript
db.agentThread.findMany({ select: { id: true } }).execute()
db.agentThread.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.agentThread.create({ data: { agentId: '<UUID>', archivedAt: '<Datetime>', databaseId: '<UUID>', isArchived: '<Boolean>', mode: '<String>', model: '<String>', ownerId: '<UUID>', parentThreadId: '<UUID>', promptTemplateId: '<UUID>', status: '<String>', systemPrompt: '<String>', tags: '<String>', title: '<String>' }, select: { id: true } }).execute()
db.agentThread.update({ where: { id: '<UUID>' }, data: { agentId: '<UUID>' }, select: { id: true } }).execute()
db.agentThread.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all agentThread records

```typescript
const items = await db.agentThread.findMany({
  select: { id: true, agentId: true }
}).execute();
```

### Create a agentThread

```typescript
const item = await db.agentThread.create({
  data: { agentId: '<UUID>', archivedAt: '<Datetime>', databaseId: '<UUID>', isArchived: '<Boolean>', mode: '<String>', model: '<String>', ownerId: '<UUID>', parentThreadId: '<UUID>', promptTemplateId: '<UUID>', status: '<String>', systemPrompt: '<String>', tags: '<String>', title: '<String>' },
  select: { id: true }
}).execute();
```
