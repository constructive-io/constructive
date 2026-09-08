# platformAgentThread

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Top-level AI/LLM conversation thread

## Usage

```typescript
db.platformAgentThread.findMany({ select: { id: true } }).execute()
db.platformAgentThread.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformAgentThread.create({ data: { agentId: '<UUID>', archivedAt: '<Datetime>', isArchived: '<Boolean>', mode: '<String>', model: '<String>', ownerId: '<UUID>', parentThreadId: '<UUID>', promptTemplateId: '<UUID>', status: '<String>', systemPrompt: '<String>', tags: '<String>', title: '<String>', visibility: '<String>' }, select: { id: true } }).execute()
db.platformAgentThread.update({ where: { id: '<UUID>' }, data: { agentId: '<UUID>' }, select: { id: true } }).execute()
db.platformAgentThread.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformAgentThread records

```typescript
const items = await db.platformAgentThread.findMany({
  select: { id: true, agentId: true }
}).execute();
```

### Create a platformAgentThread

```typescript
const item = await db.platformAgentThread.create({
  data: { agentId: '<UUID>', archivedAt: '<Datetime>', isArchived: '<Boolean>', mode: '<String>', model: '<String>', ownerId: '<UUID>', parentThreadId: '<UUID>', promptTemplateId: '<UUID>', status: '<String>', systemPrompt: '<String>', tags: '<String>', title: '<String>', visibility: '<String>' },
  select: { id: true }
}).execute();
```
