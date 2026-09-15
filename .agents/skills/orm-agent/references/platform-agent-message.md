# platformAgentMessage

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Message within an agent thread with TextPart/ToolPart jsonb parts

## Usage

```typescript
db.platformAgentMessage.findMany({ select: { id: true } }).execute()
db.platformAgentMessage.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformAgentMessage.create({ data: { actorId: '<UUID>', agentId: '<UUID>', authorRole: '<String>', deliveredRunId: '<UUID>', kind: '<String>', model: '<String>', parts: '<JSON>', threadId: '<UUID>', visibility: '<String>' }, select: { id: true } }).execute()
db.platformAgentMessage.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.platformAgentMessage.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformAgentMessage records

```typescript
const items = await db.platformAgentMessage.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a platformAgentMessage

```typescript
const item = await db.platformAgentMessage.create({
  data: { actorId: '<UUID>', agentId: '<UUID>', authorRole: '<String>', deliveredRunId: '<UUID>', kind: '<String>', model: '<String>', parts: '<JSON>', threadId: '<UUID>', visibility: '<String>' },
  select: { id: true }
}).execute();
```
