# platformAgent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Agent instance registry (human-managed or ephemeral sub-agents)

## Usage

```typescript
db.platformAgent.findMany({ select: { id: true } }).execute()
db.platformAgent.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformAgent.create({ data: { config: '<JSON>', isEphemeral: '<Boolean>', name: '<String>', ownerId: '<UUID>', parentId: '<UUID>', personaId: '<UUID>', status: '<String>', systemPrompt: '<String>' }, select: { id: true } }).execute()
db.platformAgent.update({ where: { id: '<UUID>' }, data: { config: '<JSON>' }, select: { id: true } }).execute()
db.platformAgent.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformAgent records

```typescript
const items = await db.platformAgent.findMany({
  select: { id: true, config: true }
}).execute();
```

### Create a platformAgent

```typescript
const item = await db.platformAgent.create({
  data: { config: '<JSON>', isEphemeral: '<Boolean>', name: '<String>', ownerId: '<UUID>', parentId: '<UUID>', personaId: '<UUID>', status: '<String>', systemPrompt: '<String>' },
  select: { id: true }
}).execute();
```
