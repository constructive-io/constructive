# dbUsageModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for DbUsageModule data operations

## Usage

```typescript
useDbUsageModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, tableStatsLogTableId: true, tableStatsLogTableName: true, tableStatsDailyTableId: true, tableStatsDailyTableName: true, queryStatsLogTableId: true, queryStatsLogTableName: true, queryStatsDailyTableId: true, queryStatsDailyTableName: true, interval: true, retention: true, premake: true, scope: true, prefix: true, defaultPermissions: true, apiName: true, privateApiName: true } } })
useDbUsageModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, tableStatsLogTableId: true, tableStatsLogTableName: true, tableStatsDailyTableId: true, tableStatsDailyTableName: true, queryStatsLogTableId: true, queryStatsLogTableName: true, queryStatsDailyTableId: true, queryStatsDailyTableName: true, interval: true, retention: true, premake: true, scope: true, prefix: true, defaultPermissions: true, apiName: true, privateApiName: true } } })
useCreateDbUsageModuleMutation({ selection: { fields: { id: true } } })
useUpdateDbUsageModuleMutation({ selection: { fields: { id: true } } })
useDeleteDbUsageModuleMutation({})
```

## Examples

### List all dbUsageModules

```typescript
const { data, isLoading } = useDbUsageModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, tableStatsLogTableId: true, tableStatsLogTableName: true, tableStatsDailyTableId: true, tableStatsDailyTableName: true, queryStatsLogTableId: true, queryStatsLogTableName: true, queryStatsDailyTableId: true, queryStatsDailyTableName: true, interval: true, retention: true, premake: true, scope: true, prefix: true, defaultPermissions: true, apiName: true, privateApiName: true } },
});
```

### Create a dbUsageModule

```typescript
const { mutate } = useCreateDbUsageModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', tableStatsLogTableId: '<UUID>', tableStatsLogTableName: '<String>', tableStatsDailyTableId: '<UUID>', tableStatsDailyTableName: '<String>', queryStatsLogTableId: '<UUID>', queryStatsLogTableName: '<String>', queryStatsDailyTableId: '<UUID>', queryStatsDailyTableName: '<String>', interval: '<String>', retention: '<String>', premake: '<Int>', scope: '<String>', prefix: '<String>', defaultPermissions: '<String>', apiName: '<String>', privateApiName: '<String>' });
```
