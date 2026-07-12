# agentModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for AgentModule records

## Usage

```typescript
db.agentModule.findMany({ select: { id: true } }).execute()
db.agentModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.agentModule.create({ data: { databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', threadTableId: '<UUID>', messageTableId: '<UUID>', taskTableId: '<UUID>', promptsTableId: '<UUID>', planTableId: '<UUID>', agentTableId: '<UUID>', personaTableId: '<UUID>', resourceTableId: '<UUID>', threadTableName: '<String>', messageTableName: '<String>', taskTableName: '<String>', promptsTableName: '<String>', planTableName: '<String>', agentTableName: '<String>', personaTableName: '<String>', resourceTableName: '<String>', hasPlans: '<Boolean>', hasResources: '<Boolean>', hasAgents: '<Boolean>', shared: '<Boolean>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', policies: '<JSON>', resources: '<JSON>', provisions: '<JSON>', defaultPermissions: '<String>' }, select: { id: true } }).execute()
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
  data: { databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', threadTableId: '<UUID>', messageTableId: '<UUID>', taskTableId: '<UUID>', promptsTableId: '<UUID>', planTableId: '<UUID>', agentTableId: '<UUID>', personaTableId: '<UUID>', resourceTableId: '<UUID>', threadTableName: '<String>', messageTableName: '<String>', taskTableName: '<String>', promptsTableName: '<String>', planTableName: '<String>', agentTableName: '<String>', personaTableName: '<String>', resourceTableName: '<String>', hasPlans: '<Boolean>', hasResources: '<Boolean>', hasAgents: '<Boolean>', shared: '<Boolean>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', policies: '<JSON>', resources: '<JSON>', provisions: '<JSON>', defaultPermissions: '<String>' },
  select: { id: true }
}).execute();
```
