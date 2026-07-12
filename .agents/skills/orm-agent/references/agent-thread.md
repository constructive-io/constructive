# agentThread

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Top-level AI/LLM conversation thread

## Usage

```typescript
db.agentThread.findMany({ select: { id: true } }).execute()
db.agentThread.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.agentThread.create({ data: { ownerId: '<UUID>', databaseId: '<UUID>', status: '<String>', isArchived: '<Boolean>', archivedAt: '<Datetime>', title: '<String>', mode: '<String>', model: '<String>', systemPrompt: '<String>', tags: '<String>', promptTemplateId: '<UUID>', agentId: '<UUID>', parentThreadId: '<UUID>' }, select: { id: true } }).execute()
db.agentThread.update({ where: { id: '<UUID>' }, data: { ownerId: '<UUID>' }, select: { id: true } }).execute()
db.agentThread.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all agentThread records

```typescript
const items = await db.agentThread.findMany({
  select: { id: true, ownerId: true }
}).execute();
```

### Create a agentThread

```typescript
const item = await db.agentThread.create({
  data: { ownerId: '<UUID>', databaseId: '<UUID>', status: '<String>', isArchived: '<Boolean>', archivedAt: '<Datetime>', title: '<String>', mode: '<String>', model: '<String>', systemPrompt: '<String>', tags: '<String>', promptTemplateId: '<UUID>', agentId: '<UUID>', parentThreadId: '<UUID>' },
  select: { id: true }
}).execute();
```
