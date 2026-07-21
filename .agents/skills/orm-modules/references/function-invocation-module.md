# functionInvocationModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for FunctionInvocationModule records

## Usage

```typescript
db.functionInvocationModule.findMany({ select: { id: true } }).execute()
db.functionInvocationModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.functionInvocationModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', executionLogsTableId: '<UUID>', executionLogsTableName: '<String>', invocationsTableId: '<UUID>', invocationsTableName: '<String>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>' }, select: { id: true } }).execute()
db.functionInvocationModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.functionInvocationModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all functionInvocationModule records

```typescript
const items = await db.functionInvocationModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a functionInvocationModule

```typescript
const item = await db.functionInvocationModule.create({
  data: { apiName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', executionLogsTableId: '<UUID>', executionLogsTableName: '<String>', invocationsTableId: '<UUID>', invocationsTableName: '<String>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>' },
  select: { id: true }
}).execute();
```
