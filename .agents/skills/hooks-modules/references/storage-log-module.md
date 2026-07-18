# storageLogModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for StorageLogModule data operations

## Usage

```typescript
useStorageLogModulesQuery({ selection: { fields: { actorFkTableId: true, apiName: true, databaseId: true, entityField: true, entityFkTableId: true, id: true, interval: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, retention: true, schemaId: true, scope: true, storageLogTableId: true, storageLogTableName: true, usageSummaryTableId: true, usageSummaryTableName: true } } })
useStorageLogModuleQuery({ id: '<UUID>', selection: { fields: { actorFkTableId: true, apiName: true, databaseId: true, entityField: true, entityFkTableId: true, id: true, interval: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, retention: true, schemaId: true, scope: true, storageLogTableId: true, storageLogTableName: true, usageSummaryTableId: true, usageSummaryTableName: true } } })
useCreateStorageLogModuleMutation({ selection: { fields: { id: true } } })
useUpdateStorageLogModuleMutation({ selection: { fields: { id: true } } })
useDeleteStorageLogModuleMutation({})
```

## Examples

### List all storageLogModules

```typescript
const { data, isLoading } = useStorageLogModulesQuery({
  selection: { fields: { actorFkTableId: true, apiName: true, databaseId: true, entityField: true, entityFkTableId: true, id: true, interval: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, retention: true, schemaId: true, scope: true, storageLogTableId: true, storageLogTableName: true, usageSummaryTableId: true, usageSummaryTableName: true } },
});
```

### Create a storageLogModule

```typescript
const { mutate } = useCreateStorageLogModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ actorFkTableId: '<UUID>', apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', entityFkTableId: '<UUID>', interval: '<String>', prefix: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', retention: '<String>', schemaId: '<UUID>', scope: '<String>', storageLogTableId: '<UUID>', storageLogTableName: '<String>', usageSummaryTableId: '<UUID>', usageSummaryTableName: '<String>' });
```
