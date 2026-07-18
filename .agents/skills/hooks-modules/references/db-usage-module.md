# dbUsageModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for DbUsageModule data operations

## Usage

```typescript
useDbUsageModulesQuery({ selection: { fields: { apiName: true, collectDbQueryStatsFunction: true, collectDbTableStatsFunction: true, databaseId: true, defaultPermissions: true, entityField: true, id: true, interval: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, queryStatsLogTableId: true, queryStatsLogTableName: true, queryStatsSummaryTableId: true, queryStatsSummaryTableName: true, retention: true, rollupDbQueryStatsUsageSummaryFunction: true, rollupDbTableStatsUsageSummaryFunction: true, schemaId: true, scope: true, tableStatsLogTableId: true, tableStatsLogTableName: true, tableStatsSummaryTableId: true, tableStatsSummaryTableName: true } } })
useDbUsageModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, collectDbQueryStatsFunction: true, collectDbTableStatsFunction: true, databaseId: true, defaultPermissions: true, entityField: true, id: true, interval: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, queryStatsLogTableId: true, queryStatsLogTableName: true, queryStatsSummaryTableId: true, queryStatsSummaryTableName: true, retention: true, rollupDbQueryStatsUsageSummaryFunction: true, rollupDbTableStatsUsageSummaryFunction: true, schemaId: true, scope: true, tableStatsLogTableId: true, tableStatsLogTableName: true, tableStatsSummaryTableId: true, tableStatsSummaryTableName: true } } })
useCreateDbUsageModuleMutation({ selection: { fields: { id: true } } })
useUpdateDbUsageModuleMutation({ selection: { fields: { id: true } } })
useDeleteDbUsageModuleMutation({})
```

## Examples

### List all dbUsageModules

```typescript
const { data, isLoading } = useDbUsageModulesQuery({
  selection: { fields: { apiName: true, collectDbQueryStatsFunction: true, collectDbTableStatsFunction: true, databaseId: true, defaultPermissions: true, entityField: true, id: true, interval: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, queryStatsLogTableId: true, queryStatsLogTableName: true, queryStatsSummaryTableId: true, queryStatsSummaryTableName: true, retention: true, rollupDbQueryStatsUsageSummaryFunction: true, rollupDbTableStatsUsageSummaryFunction: true, schemaId: true, scope: true, tableStatsLogTableId: true, tableStatsLogTableName: true, tableStatsSummaryTableId: true, tableStatsSummaryTableName: true } },
});
```

### Create a dbUsageModule

```typescript
const { mutate } = useCreateDbUsageModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', collectDbQueryStatsFunction: '<String>', collectDbTableStatsFunction: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', interval: '<String>', prefix: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', queryStatsLogTableId: '<UUID>', queryStatsLogTableName: '<String>', queryStatsSummaryTableId: '<UUID>', queryStatsSummaryTableName: '<String>', retention: '<String>', rollupDbQueryStatsUsageSummaryFunction: '<String>', rollupDbTableStatsUsageSummaryFunction: '<String>', schemaId: '<UUID>', scope: '<String>', tableStatsLogTableId: '<UUID>', tableStatsLogTableName: '<String>', tableStatsSummaryTableId: '<UUID>', tableStatsSummaryTableName: '<String>' });
```
