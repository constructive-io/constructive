# dbUsageModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for DbUsageModule records

## Usage

```typescript
db.dbUsageModule.findMany({ select: { id: true } }).execute()
db.dbUsageModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.dbUsageModule.create({ data: { databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', tableStatsLogTableId: '<UUID>', tableStatsLogTableName: '<String>', tableStatsDailyTableId: '<UUID>', tableStatsDailyTableName: '<String>', queryStatsLogTableId: '<UUID>', queryStatsLogTableName: '<String>', queryStatsDailyTableId: '<UUID>', queryStatsDailyTableName: '<String>', collectDbTableStatsFunction: '<String>', collectDbQueryStatsFunction: '<String>', rollupDbTableStatsDailyFunction: '<String>', rollupDbQueryStatsDailyFunction: '<String>', interval: '<String>', retention: '<String>', premake: '<Int>', scope: '<String>', prefix: '<String>', defaultPermissions: '<String>', apiName: '<String>', privateApiName: '<String>' }, select: { id: true } }).execute()
db.dbUsageModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.dbUsageModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all dbUsageModule records

```typescript
const items = await db.dbUsageModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a dbUsageModule

```typescript
const item = await db.dbUsageModule.create({
  data: { databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', tableStatsLogTableId: '<UUID>', tableStatsLogTableName: '<String>', tableStatsDailyTableId: '<UUID>', tableStatsDailyTableName: '<String>', queryStatsLogTableId: '<UUID>', queryStatsLogTableName: '<String>', queryStatsDailyTableId: '<UUID>', queryStatsDailyTableName: '<String>', collectDbTableStatsFunction: '<String>', collectDbQueryStatsFunction: '<String>', rollupDbTableStatsDailyFunction: '<String>', rollupDbQueryStatsDailyFunction: '<String>', interval: '<String>', retention: '<String>', premake: '<Int>', scope: '<String>', prefix: '<String>', defaultPermissions: '<String>', apiName: '<String>', privateApiName: '<String>' },
  select: { id: true }
}).execute();
```
