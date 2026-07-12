# agentMessage

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Message within an agent thread with TextPart/ToolPart jsonb parts

## Usage

```typescript
db.agentMessage.findMany({ select: { id: true } }).execute()
db.agentMessage.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.agentMessage.create({ data: { actorId: '<UUID>', parts: '<JSON>', threadId: '<UUID>', databaseId: '<UUID>', authorRole: '<String>', model: '<String>', agentId: '<UUID>' }, select: { id: true } }).execute()
db.agentMessage.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.agentMessage.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all agentMessage records

```typescript
const items = await db.agentMessage.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a agentMessage

```typescript
const item = await db.agentMessage.create({
  data: { actorId: '<UUID>', parts: '<JSON>', threadId: '<UUID>', databaseId: '<UUID>', authorRole: '<String>', model: '<String>', agentId: '<UUID>' },
  select: { id: true }
}).execute();
```
