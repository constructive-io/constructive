# dbUsageModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for DbUsageModule records

## Usage

```typescript
db.dbUsageModule.findMany({ select: { id: true } }).execute()
db.dbUsageModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.dbUsageModule.create({ data: { apiName: '<String>', collectDbQueryStatsFunction: '<String>', collectDbTableStatsFunction: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', interval: '<String>', prefix: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', queryStatsDailyTableId: '<UUID>', queryStatsDailyTableName: '<String>', queryStatsLogTableId: '<UUID>', queryStatsLogTableName: '<String>', retention: '<String>', rollupDbQueryStatsDailyFunction: '<String>', rollupDbTableStatsDailyFunction: '<String>', schemaId: '<UUID>', scope: '<String>', tableStatsDailyTableId: '<UUID>', tableStatsDailyTableName: '<String>', tableStatsLogTableId: '<UUID>', tableStatsLogTableName: '<String>' }, select: { id: true } }).execute()
db.dbUsageModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.dbUsageModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all dbUsageModule records

```typescript
const items = await db.dbUsageModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a dbUsageModule

```typescript
const item = await db.dbUsageModule.create({
  data: { apiName: '<String>', collectDbQueryStatsFunction: '<String>', collectDbTableStatsFunction: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', interval: '<String>', prefix: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', queryStatsDailyTableId: '<UUID>', queryStatsDailyTableName: '<String>', queryStatsLogTableId: '<UUID>', queryStatsLogTableName: '<String>', retention: '<String>', rollupDbQueryStatsDailyFunction: '<String>', rollupDbTableStatsDailyFunction: '<String>', schemaId: '<UUID>', scope: '<String>', tableStatsDailyTableId: '<UUID>', tableStatsDailyTableName: '<String>', tableStatsLogTableId: '<UUID>', tableStatsLogTableName: '<String>' },
  select: { id: true }
}).execute();
```
