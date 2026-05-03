# agentThread

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Top-level AI/LLM conversation. Owns the chat-mode + model + system-prompt snapshot for the lifetime of the conversation, and is the entity-scoping anchor — descendants (agent_message, agent_task) inherit entity_id from this row via DataInheritFromParent. RLS is owner-only (AuthzDirectOwner); entity_id is a grouping dimension, not a security dimension.

## Usage

```typescript
db.agentThread.findMany({ select: { id: true } }).execute()
db.agentThread.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.agentThread.create({ data: { title: '<String>', mode: '<String>', model: '<String>', systemPrompt: '<String>', ownerId: '<UUID>', entityId: '<UUID>', status: '<String>' }, select: { id: true } }).execute()
db.agentThread.update({ where: { id: '<UUID>' }, data: { title: '<String>' }, select: { id: true } }).execute()
db.agentThread.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all agentThread records

```typescript
const items = await db.agentThread.findMany({
  select: { id: true, title: true }
}).execute();
```

### Create a agentThread

```typescript
const item = await db.agentThread.create({
  data: { title: '<String>', mode: '<String>', model: '<String>', systemPrompt: '<String>', ownerId: '<UUID>', entityId: '<UUID>', status: '<String>' },
  select: { id: true }
}).execute();
```
