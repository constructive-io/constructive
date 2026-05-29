# agentModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for AgentModule records

## Usage

```typescript
db.agentModule.findMany({ select: { id: true } }).execute()
db.agentModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.agentModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', threadTableId: '<UUID>', messageTableId: '<UUID>', taskTableId: '<UUID>', promptsTableId: '<UUID>', knowledgeTableId: '<UUID>', threadTableName: '<String>', messageTableName: '<String>', taskTableName: '<String>', promptsTableName: '<String>', knowledgeTableName: '<String>', hasKnowledge: '<Boolean>', apiName: '<String>', membershipType: '<Int>', key: '<String>', entityTableId: '<UUID>', policies: '<JSON>', knowledgeConfig: '<JSON>', knowledgePolicies: '<JSON>', provisions: '<JSON>' }, select: { id: true } }).execute()
db.agentModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.agentModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all agentModule records

```typescript
const items = await db.agentModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a agentModule

```typescript
const item = await db.agentModule.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', threadTableId: '<UUID>', messageTableId: '<UUID>', taskTableId: '<UUID>', promptsTableId: '<UUID>', knowledgeTableId: '<UUID>', threadTableName: '<String>', messageTableName: '<String>', taskTableName: '<String>', promptsTableName: '<String>', knowledgeTableName: '<String>', hasKnowledge: '<Boolean>', apiName: '<String>', membershipType: '<Int>', key: '<String>', entityTableId: '<UUID>', policies: '<JSON>', knowledgeConfig: '<JSON>', knowledgePolicies: '<JSON>', provisions: '<JSON>' },
  select: { id: true }
}).execute();
```
