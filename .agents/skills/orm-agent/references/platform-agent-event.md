# platformAgentEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Append-only transcript of an agent run: one agent session entry per row, stored verbatim

## Usage

```typescript
db.platformAgentEvent.findMany({ select: { id: true } }).execute()
db.platformAgentEvent.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformAgentEvent.create({ data: { actorId: '<UUID>', entry: '<JSON>', recordedAt: '<Datetime>', runId: '<UUID>', seq: '<Int>', transcriptFormat: '<String>', transcriptVersion: '<Int>', visibility: '<String>' }, select: { id: true } }).execute()
db.platformAgentEvent.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.platformAgentEvent.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformAgentEvent records

```typescript
const items = await db.platformAgentEvent.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a platformAgentEvent

```typescript
const item = await db.platformAgentEvent.create({
  data: { actorId: '<UUID>', entry: '<JSON>', recordedAt: '<Datetime>', runId: '<UUID>', seq: '<Int>', transcriptFormat: '<String>', transcriptVersion: '<Int>', visibility: '<String>' },
  select: { id: true }
}).execute();
```
