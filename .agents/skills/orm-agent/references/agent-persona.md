# agentPersona

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Agent persona templates (role, system prompt, default skills/knowledge)

## Usage

```typescript
db.agentPersona.findMany({ select: { id: true } }).execute()
db.agentPersona.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.agentPersona.create({ data: { config: '<JSON>', createdBy: '<UUID>', databaseId: '<UUID>', description: '<String>', isActive: '<Boolean>', name: '<String>', resources: '<String>', slug: '<String>', systemPrompt: '<String>', updatedBy: '<UUID>' }, select: { id: true } }).execute()
db.agentPersona.update({ where: { id: '<UUID>' }, data: { config: '<JSON>' }, select: { id: true } }).execute()
db.agentPersona.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all agentPersona records

```typescript
const items = await db.agentPersona.findMany({
  select: { id: true, config: true }
}).execute();
```

### Create a agentPersona

```typescript
const item = await db.agentPersona.create({
  data: { config: '<JSON>', createdBy: '<UUID>', databaseId: '<UUID>', description: '<String>', isActive: '<Boolean>', name: '<String>', resources: '<String>', slug: '<String>', systemPrompt: '<String>', updatedBy: '<UUID>' },
  select: { id: true }
}).execute();
```
