# functionInvocationModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for FunctionInvocationModule records

## Usage

```typescript
db.functionInvocationModule.findMany({ select: { id: true } }).execute()
db.functionInvocationModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.functionInvocationModule.create({ data: { databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', invocationsTableId: '<UUID>', executionLogsTableId: '<UUID>', invocationsTableName: '<String>', executionLogsTableName: '<String>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', policies: '<JSON>', provisions: '<JSON>', defaultPermissions: '<String>' }, select: { id: true } }).execute()
db.functionInvocationModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.functionInvocationModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all functionInvocationModule records

```typescript
const items = await db.functionInvocationModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a functionInvocationModule

```typescript
const item = await db.functionInvocationModule.create({
  data: { databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', invocationsTableId: '<UUID>', executionLogsTableId: '<UUID>', invocationsTableName: '<String>', executionLogsTableName: '<String>', apiName: '<String>', privateApiName: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', policies: '<JSON>', provisions: '<JSON>', defaultPermissions: '<String>' },
  select: { id: true }
}).execute();
```
