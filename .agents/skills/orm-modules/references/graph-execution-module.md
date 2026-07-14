# graphExecutionModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for GraphExecutionModule records

## Usage

```typescript
db.graphExecutionModule.findMany({ select: { id: true } }).execute()
db.graphExecutionModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.graphExecutionModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', executionsTableId: '<UUID>', executionsTableName: '<String>', graphModuleId: '<UUID>', nodeStatesTableId: '<UUID>', nodeStatesTableName: '<String>', outputsTableId: '<UUID>', outputsTableName: '<String>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>' }, select: { id: true } }).execute()
db.graphExecutionModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.graphExecutionModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all graphExecutionModule records

```typescript
const items = await db.graphExecutionModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a graphExecutionModule

```typescript
const item = await db.graphExecutionModule.create({
  data: { apiName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', executionsTableId: '<UUID>', executionsTableName: '<String>', graphModuleId: '<UUID>', nodeStatesTableId: '<UUID>', nodeStatesTableName: '<String>', outputsTableId: '<UUID>', outputsTableName: '<String>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>' },
  select: { id: true }
}).execute();
```
