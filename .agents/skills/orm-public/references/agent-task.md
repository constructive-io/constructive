# agentTask

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

An agent- or user-authored todo item attached to an agent_thread. Captures the planning surface for agent-mode conversations: each row is a single discrete unit of work with a status lifecycle (pending → in-progress → done|failed). Cascade-deleted with the parent thread; RLS is owner-only.

## Usage

```typescript
db.agentTask.findMany({ select: { id: true } }).execute()
db.agentTask.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.agentTask.create({ data: { threadId: '<UUID>', entityId: '<UUID>', description: '<String>', source: '<String>', error: '<String>', ownerId: '<UUID>', status: '<String>' }, select: { id: true } }).execute()
db.agentTask.update({ where: { id: '<UUID>' }, data: { threadId: '<UUID>' }, select: { id: true } }).execute()
db.agentTask.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all agentTask records

```typescript
const items = await db.agentTask.findMany({
  select: { id: true, threadId: true }
}).execute();
```

### Create a agentTask

```typescript
const item = await db.agentTask.create({
  data: { threadId: '<UUID>', entityId: '<UUID>', description: '<String>', source: '<String>', error: '<String>', ownerId: '<UUID>', status: '<String>' },
  select: { id: true }
}).execute();
```
