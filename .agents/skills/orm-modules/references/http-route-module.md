# httpRouteModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for HttpRouteModule records

## Usage

```typescript
db.httpRouteModule.findMany({ select: { id: true } }).execute()
db.httpRouteModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.httpRouteModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', functionModuleId: '<UUID>', httpRoutesTableId: '<UUID>', httpRoutesTableName: '<String>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', resolverFunctionName: '<String>', resourceModuleId: '<UUID>', schemaId: '<UUID>', scope: '<String>', storageModuleId: '<UUID>' }, select: { id: true } }).execute()
db.httpRouteModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.httpRouteModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all httpRouteModule records

```typescript
const items = await db.httpRouteModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a httpRouteModule

```typescript
const item = await db.httpRouteModule.create({
  data: { apiName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', functionModuleId: '<UUID>', httpRoutesTableId: '<UUID>', httpRoutesTableName: '<String>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', resolverFunctionName: '<String>', resourceModuleId: '<UUID>', schemaId: '<UUID>', scope: '<String>', storageModuleId: '<UUID>' },
  select: { id: true }
}).execute();
```
