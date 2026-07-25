# routeModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for RouteModule records

## Usage

```typescript
db.routeModule.findMany({ select: { id: true } }).execute()
db.routeModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.routeModule.create({ data: { apiName: '<String>', catalogModuleId: '<UUID>', databaseId: '<UUID>', defaultPermissions: '<String>', domainModuleId: '<UUID>', entityField: '<String>', entityTableId: '<UUID>', hostnameBindingsTableId: '<UUID>', hostnameBindingsTableName: '<String>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', resolverFunctionName: '<String>', routeBindingsTableId: '<UUID>', routeBindingsTableName: '<String>', routesTableId: '<UUID>', routesTableName: '<String>', schemaId: '<UUID>', scope: '<String>' }, select: { id: true } }).execute()
db.routeModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.routeModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all routeModule records

```typescript
const items = await db.routeModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a routeModule

```typescript
const item = await db.routeModule.create({
  data: { apiName: '<String>', catalogModuleId: '<UUID>', databaseId: '<UUID>', defaultPermissions: '<String>', domainModuleId: '<UUID>', entityField: '<String>', entityTableId: '<UUID>', hostnameBindingsTableId: '<UUID>', hostnameBindingsTableName: '<String>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', resolverFunctionName: '<String>', routeBindingsTableId: '<UUID>', routeBindingsTableName: '<String>', routesTableId: '<UUID>', routesTableName: '<String>', schemaId: '<UUID>', scope: '<String>' },
  select: { id: true }
}).execute();
```
