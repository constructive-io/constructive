# platformAgentPrompt

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Shared system prompt templates for agent conversations

## Usage

```typescript
db.platformAgentPrompt.findMany({ select: { id: true } }).execute()
db.platformAgentPrompt.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformAgentPrompt.create({ data: { content: '<String>', createdBy: '<UUID>', createdByPrincipal: '<UUID>', description: '<String>', isDefault: '<Boolean>', metadata: '<JSON>', name: '<String>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' }, select: { id: true } }).execute()
db.platformAgentPrompt.update({ where: { id: '<UUID>' }, data: { content: '<String>' }, select: { id: true } }).execute()
db.platformAgentPrompt.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformAgentPrompt records

```typescript
const items = await db.platformAgentPrompt.findMany({
  select: { id: true, content: true }
}).execute();
```

### Create a platformAgentPrompt

```typescript
const item = await db.platformAgentPrompt.create({
  data: { content: '<String>', createdBy: '<UUID>', createdByPrincipal: '<UUID>', description: '<String>', isDefault: '<Boolean>', metadata: '<JSON>', name: '<String>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' },
  select: { id: true }
}).execute();
```
