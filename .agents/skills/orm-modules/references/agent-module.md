# agentModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for AgentModule records

## Usage

```typescript
db.agentModule.findMany({ select: { id: true } }).execute()
db.agentModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.agentModule.create({ data: { agentTableId: '<UUID>', agentTableName: '<String>', apiName: '<String>', databaseId: '<UUID>', defaultCapabilities: '<String>', defaultVisibility: '<String>', entityField: '<String>', entityTableId: '<UUID>', eventTableId: '<UUID>', eventTableName: '<String>', hasAgents: '<Boolean>', hasAttachments: '<Boolean>', hasPlans: '<Boolean>', hasRepositoryResources: '<Boolean>', hasResources: '<Boolean>', hasRuns: '<Boolean>', messageTableId: '<UUID>', messageTableName: '<String>', personaTableId: '<UUID>', personaTableName: '<String>', planTableId: '<UUID>', planTableName: '<String>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', promptsTableId: '<UUID>', promptsTableName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', resourceRepositoryTableId: '<UUID>', resourceRepositoryTableName: '<String>', resourceTableId: '<UUID>', resourceTableName: '<String>', resources: '<JSON>', runTableId: '<UUID>', runTableName: '<String>', schemaId: '<UUID>', scope: '<String>', taskTableId: '<UUID>', taskTableName: '<String>', threadTableId: '<UUID>', threadTableName: '<String>', workspaceTableId: '<UUID>', workspaceTableName: '<String>' }, select: { id: true } }).execute()
db.agentModule.update({ where: { id: '<UUID>' }, data: { agentTableId: '<UUID>' }, select: { id: true } }).execute()
db.agentModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all agentModule records

```typescript
const items = await db.agentModule.findMany({
  select: { id: true, agentTableId: true }
}).execute();
```

### Create a agentModule

```typescript
const item = await db.agentModule.create({
  data: { agentTableId: '<UUID>', agentTableName: '<String>', apiName: '<String>', databaseId: '<UUID>', defaultCapabilities: '<String>', defaultVisibility: '<String>', entityField: '<String>', entityTableId: '<UUID>', eventTableId: '<UUID>', eventTableName: '<String>', hasAgents: '<Boolean>', hasAttachments: '<Boolean>', hasPlans: '<Boolean>', hasRepositoryResources: '<Boolean>', hasResources: '<Boolean>', hasRuns: '<Boolean>', messageTableId: '<UUID>', messageTableName: '<String>', personaTableId: '<UUID>', personaTableName: '<String>', planTableId: '<UUID>', planTableName: '<String>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', promptsTableId: '<UUID>', promptsTableName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', resourceRepositoryTableId: '<UUID>', resourceRepositoryTableName: '<String>', resourceTableId: '<UUID>', resourceTableName: '<String>', resources: '<JSON>', runTableId: '<UUID>', runTableName: '<String>', schemaId: '<UUID>', scope: '<String>', taskTableId: '<UUID>', taskTableName: '<String>', threadTableId: '<UUID>', threadTableName: '<String>', workspaceTableId: '<UUID>', workspaceTableName: '<String>' },
  select: { id: true }
}).execute();
```
