# apiSurfaceModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for ApiSurfaceModule records

## Usage

```typescript
db.apiSurfaceModule.findMany({ select: { id: true } }).execute()
db.apiSurfaceModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.apiSurfaceModule.create({ data: { apiModulesTableId: '<UUID>', apiModulesTableName: '<String>', apiName: '<String>', apiSchemasTableId: '<UUID>', apiSchemasTableName: '<String>', apiSettingsTableId: '<UUID>', apiSettingsTableName: '<String>', apisTableId: '<UUID>', apisTableName: '<String>', catalogModuleId: '<UUID>', corsSettingsTableId: '<UUID>', corsSettingsTableName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>' }, select: { id: true } }).execute()
db.apiSurfaceModule.update({ where: { id: '<UUID>' }, data: { apiModulesTableId: '<UUID>' }, select: { id: true } }).execute()
db.apiSurfaceModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all apiSurfaceModule records

```typescript
const items = await db.apiSurfaceModule.findMany({
  select: { id: true, apiModulesTableId: true }
}).execute();
```

### Create a apiSurfaceModule

```typescript
const item = await db.apiSurfaceModule.create({
  data: { apiModulesTableId: '<UUID>', apiModulesTableName: '<String>', apiName: '<String>', apiSchemasTableId: '<UUID>', apiSchemasTableName: '<String>', apiSettingsTableId: '<UUID>', apiSettingsTableName: '<String>', apisTableId: '<UUID>', apisTableName: '<String>', catalogModuleId: '<UUID>', corsSettingsTableId: '<UUID>', corsSettingsTableName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>' },
  select: { id: true }
}).execute();
```
