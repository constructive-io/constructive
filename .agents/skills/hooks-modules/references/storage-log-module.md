# storageLogModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for StorageLogModule data operations

## Usage

```typescript
useStorageLogModulesQuery({ selection: { fields: { apiName: true, databaseId: true, entityField: true, id: true, interval: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, retention: true, rollupFunctionName: true, schemaId: true, scope: true, storageLogTableId: true, storageLogTableName: true, usageSummaryTableId: true, usageSummaryTableName: true } } })
useStorageLogModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, databaseId: true, entityField: true, id: true, interval: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, retention: true, rollupFunctionName: true, schemaId: true, scope: true, storageLogTableId: true, storageLogTableName: true, usageSummaryTableId: true, usageSummaryTableName: true } } })
useCreateStorageLogModuleMutation({ selection: { fields: { id: true } } })
useUpdateStorageLogModuleMutation({ selection: { fields: { id: true } } })
useDeleteStorageLogModuleMutation({})
```

## Examples

### List all storageLogModules

```typescript
const { data, isLoading } = useStorageLogModulesQuery({
  selection: { fields: { apiName: true, databaseId: true, entityField: true, id: true, interval: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, retention: true, rollupFunctionName: true, schemaId: true, scope: true, storageLogTableId: true, storageLogTableName: true, usageSummaryTableId: true, usageSummaryTableName: true } },
});
```

### Create a storageLogModule

```typescript
const { mutate } = useCreateStorageLogModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', interval: '<String>', prefix: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', retention: '<String>', rollupFunctionName: '<String>', schemaId: '<UUID>', scope: '<String>', storageLogTableId: '<UUID>', storageLogTableName: '<String>', usageSummaryTableId: '<UUID>', usageSummaryTableName: '<String>' });
```
