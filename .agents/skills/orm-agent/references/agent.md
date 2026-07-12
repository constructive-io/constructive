# agent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Agent instance registry (human-managed or ephemeral sub-agents)

## Usage

```typescript
db.agent.findMany({ select: { id: true } }).execute()
db.agent.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.agent.create({ data: { ownerId: '<UUID>', databaseId: '<UUID>', personaId: '<UUID>', parentId: '<UUID>', name: '<String>', systemPrompt: '<String>', config: '<JSON>', status: '<String>', isEphemeral: '<Boolean>' }, select: { id: true } }).execute()
db.agent.update({ where: { id: '<UUID>' }, data: { ownerId: '<UUID>' }, select: { id: true } }).execute()
db.agent.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all agent records

```typescript
const items = await db.agent.findMany({
  select: { id: true, ownerId: true }
}).execute();
```

### Create a agent

```typescript
const item = await db.agent.create({
  data: { ownerId: '<UUID>', databaseId: '<UUID>', personaId: '<UUID>', parentId: '<UUID>', name: '<String>', systemPrompt: '<String>', config: '<JSON>', status: '<String>', isEphemeral: '<Boolean>' },
  select: { id: true }
}).execute();
```
