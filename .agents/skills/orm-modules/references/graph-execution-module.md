# graphExecutionModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for GraphExecutionModule records

## Usage

```typescript
db.graphExecutionModule.findMany({ select: { id: true } }).execute()
db.graphExecutionModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.graphExecutionModule.create({ data: { databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', graphModuleId: '<UUID>', scope: '<String>', prefix: '<String>', executionsTableId: '<UUID>', outputsTableId: '<UUID>', nodeStatesTableId: '<UUID>', executionsTableName: '<String>', outputsTableName: '<String>', nodeStatesTableName: '<String>', apiName: '<String>', privateApiName: '<String>', entityTableId: '<UUID>', policies: '<JSON>', provisions: '<JSON>', defaultPermissions: '<String>' }, select: { id: true } }).execute()
db.graphExecutionModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.graphExecutionModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all graphExecutionModule records

```typescript
const items = await db.graphExecutionModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a graphExecutionModule

```typescript
const item = await db.graphExecutionModule.create({
  data: { databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', graphModuleId: '<UUID>', scope: '<String>', prefix: '<String>', executionsTableId: '<UUID>', outputsTableId: '<UUID>', nodeStatesTableId: '<UUID>', executionsTableName: '<String>', outputsTableName: '<String>', nodeStatesTableName: '<String>', apiName: '<String>', privateApiName: '<String>', entityTableId: '<UUID>', policies: '<JSON>', provisions: '<JSON>', defaultPermissions: '<String>' },
  select: { id: true }
}).execute();
```
