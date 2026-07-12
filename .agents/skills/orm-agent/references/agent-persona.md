# agentPersona

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Agent persona templates (role, system prompt, default skills/knowledge)

## Usage

```typescript
db.agentPersona.findMany({ select: { id: true } }).execute()
db.agentPersona.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.agentPersona.create({ data: { createdBy: '<UUID>', updatedBy: '<UUID>', databaseId: '<UUID>', slug: '<String>', name: '<String>', description: '<String>', systemPrompt: '<String>', resources: '<String>', config: '<JSON>', isActive: '<Boolean>' }, select: { id: true } }).execute()
db.agentPersona.update({ where: { id: '<UUID>' }, data: { createdBy: '<UUID>' }, select: { id: true } }).execute()
db.agentPersona.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all agentPersona records

```typescript
const items = await db.agentPersona.findMany({
  select: { id: true, createdBy: true }
}).execute();
```

### Create a agentPersona

```typescript
const item = await db.agentPersona.create({
  data: { createdBy: '<UUID>', updatedBy: '<UUID>', databaseId: '<UUID>', slug: '<String>', name: '<String>', description: '<String>', systemPrompt: '<String>', resources: '<String>', config: '<JSON>', isActive: '<Boolean>' },
  select: { id: true }
}).execute();
```
