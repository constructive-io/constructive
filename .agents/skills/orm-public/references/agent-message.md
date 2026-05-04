# agentMessage

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

A single message in an agent_thread. The full client-rendered content (TextPart and ToolPart, including the ToolPart state machine and inline approval object) lives in the `parts` jsonb column — there is no separate agent_tool_call or agent_tool_approval table in v1. Cascade-deleted with the parent thread; RLS is owner-only.

## Usage

```typescript
db.agentMessage.findMany({ select: { id: true } }).execute()
db.agentMessage.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.agentMessage.create({ data: { threadId: '<UUID>', entityId: '<UUID>', authorRole: '<String>', ownerId: '<UUID>', parts: '<JSON>' }, select: { id: true } }).execute()
db.agentMessage.update({ where: { id: '<UUID>' }, data: { threadId: '<UUID>' }, select: { id: true } }).execute()
db.agentMessage.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all agentMessage records

```typescript
const items = await db.agentMessage.findMany({
  select: { id: true, threadId: true }
}).execute();
```

### Create a agentMessage

```typescript
const item = await db.agentMessage.create({
  data: { threadId: '<UUID>', entityId: '<UUID>', authorRole: '<String>', ownerId: '<UUID>', parts: '<JSON>' },
  select: { id: true }
}).execute();
```
