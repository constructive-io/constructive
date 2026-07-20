# appModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for AppModule records

## Usage

```typescript
db.appModule.findMany({ select: { id: true } }).execute()
db.appModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.appModule.create({ data: { apiName: '<String>', appMembersTableId: '<UUID>', appMembersTableName: '<String>', appsTableId: '<UUID>', appsTableName: '<String>', catalogModuleId: '<UUID>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>' }, select: { id: true } }).execute()
db.appModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.appModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all appModule records

```typescript
const items = await db.appModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a appModule

```typescript
const item = await db.appModule.create({
  data: { apiName: '<String>', appMembersTableId: '<UUID>', appMembersTableName: '<String>', appsTableId: '<UUID>', appsTableName: '<String>', catalogModuleId: '<UUID>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>' },
  select: { id: true }
}).execute();
```
