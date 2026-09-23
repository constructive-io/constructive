# agentEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Append-only transcript of an agent run: one agent session entry per row, stored verbatim

## Usage

```typescript
db.agentEvent.findMany({ select: { id: true } }).execute()
db.agentEvent.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.agentEvent.create({ data: { actorId: '<UUID>', databaseId: '<UUID>', entry: '<JSON>', recordedAt: '<Datetime>', runId: '<UUID>', seq: '<Int>', transcriptFormat: '<String>', transcriptVersion: '<Int>', visibility: '<String>' }, select: { id: true } }).execute()
db.agentEvent.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.agentEvent.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all agentEvent records

```typescript
const items = await db.agentEvent.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a agentEvent

```typescript
const item = await db.agentEvent.create({
  data: { actorId: '<UUID>', databaseId: '<UUID>', entry: '<JSON>', recordedAt: '<Datetime>', runId: '<UUID>', seq: '<Int>', transcriptFormat: '<String>', transcriptVersion: '<Int>', visibility: '<String>' },
  select: { id: true }
}).execute();
```
