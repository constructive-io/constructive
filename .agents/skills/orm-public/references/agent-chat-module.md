# agentChatModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for AgentChatModule records

## Usage

```typescript
db.agentChatModule.findMany({ select: { id: true } }).execute()
db.agentChatModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.agentChatModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', apiId: '<UUID>', threadTableId: '<UUID>', threadTableName: '<String>', messageTableId: '<UUID>', messageTableName: '<String>', taskTableId: '<UUID>', taskTableName: '<String>', prefix: '<String>' }, select: { id: true } }).execute()
db.agentChatModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.agentChatModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all agentChatModule records

```typescript
const items = await db.agentChatModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a agentChatModule

```typescript
const item = await db.agentChatModule.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', apiId: '<UUID>', threadTableId: '<UUID>', threadTableName: '<String>', messageTableId: '<UUID>', messageTableName: '<String>', taskTableId: '<UUID>', taskTableName: '<String>', prefix: '<String>' },
  select: { id: true }
}).execute();
```
