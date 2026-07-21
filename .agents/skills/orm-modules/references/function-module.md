# functionModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for FunctionModule records

## Usage

```typescript
db.functionModule.findMany({ select: { id: true } }).execute()
db.functionModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.functionModule.create({ data: { apiName: '<String>', bindingsTableId: '<UUID>', bindingsTableName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', definitionsTableId: '<UUID>', definitionsTableName: '<String>', entityField: '<String>', entityTableId: '<UUID>', hasCron: '<Boolean>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schedulesTableId: '<UUID>', schemaId: '<UUID>', scope: '<String>' }, select: { id: true } }).execute()
db.functionModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.functionModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all functionModule records

```typescript
const items = await db.functionModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a functionModule

```typescript
const item = await db.functionModule.create({
  data: { apiName: '<String>', bindingsTableId: '<UUID>', bindingsTableName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', definitionsTableId: '<UUID>', definitionsTableName: '<String>', entityField: '<String>', entityTableId: '<UUID>', hasCron: '<Boolean>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schedulesTableId: '<UUID>', schemaId: '<UUID>', scope: '<String>' },
  select: { id: true }
}).execute();
```
