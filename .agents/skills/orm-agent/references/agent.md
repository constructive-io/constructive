# agent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Agent instance registry (human-managed or ephemeral sub-agents)

## Usage

```typescript
db.agent.findMany({ select: { id: true } }).execute()
db.agent.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.agent.create({ data: { config: '<JSON>', databaseId: '<UUID>', isEphemeral: '<Boolean>', name: '<String>', ownerId: '<UUID>', parentId: '<UUID>', personaId: '<UUID>', status: '<String>', systemPrompt: '<String>' }, select: { id: true } }).execute()
db.agent.update({ where: { id: '<UUID>' }, data: { config: '<JSON>' }, select: { id: true } }).execute()
db.agent.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all agent records

```typescript
const items = await db.agent.findMany({
  select: { id: true, config: true }
}).execute();
```

### Create a agent

```typescript
const item = await db.agent.create({
  data: { config: '<JSON>', databaseId: '<UUID>', isEphemeral: '<Boolean>', name: '<String>', ownerId: '<UUID>', parentId: '<UUID>', personaId: '<UUID>', status: '<String>', systemPrompt: '<String>' },
  select: { id: true }
}).execute();
```
