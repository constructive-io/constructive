# platformAgentPersona

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Agent persona templates (role, system prompt, default skills/knowledge)

## Usage

```typescript
db.platformAgentPersona.findMany({ select: { id: true } }).execute()
db.platformAgentPersona.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformAgentPersona.create({ data: { config: '<JSON>', createdBy: '<UUID>', createdByPrincipal: '<UUID>', description: '<String>', isActive: '<Boolean>', name: '<String>', resources: '<String>', slug: '<String>', systemPrompt: '<String>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' }, select: { id: true } }).execute()
db.platformAgentPersona.update({ where: { id: '<UUID>' }, data: { config: '<JSON>' }, select: { id: true } }).execute()
db.platformAgentPersona.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformAgentPersona records

```typescript
const items = await db.platformAgentPersona.findMany({
  select: { id: true, config: true }
}).execute();
```

### Create a platformAgentPersona

```typescript
const item = await db.platformAgentPersona.create({
  data: { config: '<JSON>', createdBy: '<UUID>', createdByPrincipal: '<UUID>', description: '<String>', isActive: '<Boolean>', name: '<String>', resources: '<String>', slug: '<String>', systemPrompt: '<String>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' },
  select: { id: true }
}).execute();
```
