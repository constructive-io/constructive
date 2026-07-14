# dbUsageModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for DbUsageModule data operations

## Usage

```typescript
useDbUsageModulesQuery({ selection: { fields: { apiName: true, collectDbQueryStatsFunction: true, collectDbTableStatsFunction: true, databaseId: true, defaultPermissions: true, entityField: true, id: true, interval: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, queryStatsDailyTableId: true, queryStatsDailyTableName: true, queryStatsLogTableId: true, queryStatsLogTableName: true, retention: true, rollupDbQueryStatsDailyFunction: true, rollupDbTableStatsDailyFunction: true, schemaId: true, scope: true, tableStatsDailyTableId: true, tableStatsDailyTableName: true, tableStatsLogTableId: true, tableStatsLogTableName: true } } })
useDbUsageModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, collectDbQueryStatsFunction: true, collectDbTableStatsFunction: true, databaseId: true, defaultPermissions: true, entityField: true, id: true, interval: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, queryStatsDailyTableId: true, queryStatsDailyTableName: true, queryStatsLogTableId: true, queryStatsLogTableName: true, retention: true, rollupDbQueryStatsDailyFunction: true, rollupDbTableStatsDailyFunction: true, schemaId: true, scope: true, tableStatsDailyTableId: true, tableStatsDailyTableName: true, tableStatsLogTableId: true, tableStatsLogTableName: true } } })
useCreateDbUsageModuleMutation({ selection: { fields: { id: true } } })
useUpdateDbUsageModuleMutation({ selection: { fields: { id: true } } })
useDeleteDbUsageModuleMutation({})
```

## Examples

### List all dbUsageModules

```typescript
const { data, isLoading } = useDbUsageModulesQuery({
  selection: { fields: { apiName: true, collectDbQueryStatsFunction: true, collectDbTableStatsFunction: true, databaseId: true, defaultPermissions: true, entityField: true, id: true, interval: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, queryStatsDailyTableId: true, queryStatsDailyTableName: true, queryStatsLogTableId: true, queryStatsLogTableName: true, retention: true, rollupDbQueryStatsDailyFunction: true, rollupDbTableStatsDailyFunction: true, schemaId: true, scope: true, tableStatsDailyTableId: true, tableStatsDailyTableName: true, tableStatsLogTableId: true, tableStatsLogTableName: true } },
});
```

### Create a dbUsageModule

```typescript
const { mutate } = useCreateDbUsageModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', collectDbQueryStatsFunction: '<String>', collectDbTableStatsFunction: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', interval: '<String>', prefix: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', queryStatsDailyTableId: '<UUID>', queryStatsDailyTableName: '<String>', queryStatsLogTableId: '<UUID>', queryStatsLogTableName: '<String>', retention: '<String>', rollupDbQueryStatsDailyFunction: '<String>', rollupDbTableStatsDailyFunction: '<String>', schemaId: '<UUID>', scope: '<String>', tableStatsDailyTableId: '<UUID>', tableStatsDailyTableName: '<String>', tableStatsLogTableId: '<UUID>', tableStatsLogTableName: '<String>' });
```
