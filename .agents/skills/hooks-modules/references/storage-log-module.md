# storageLogModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for StorageLogModule data operations

## Usage

```typescript
useStorageLogModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, storageLogTableId: true, storageLogTableName: true, usageDailyTableId: true, usageDailyTableName: true, interval: true, retention: true, premake: true, scope: true, actorFkTableId: true, entityFkTableId: true, prefix: true, apiName: true, privateApiName: true } } })
useStorageLogModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, storageLogTableId: true, storageLogTableName: true, usageDailyTableId: true, usageDailyTableName: true, interval: true, retention: true, premake: true, scope: true, actorFkTableId: true, entityFkTableId: true, prefix: true, apiName: true, privateApiName: true } } })
useCreateStorageLogModuleMutation({ selection: { fields: { id: true } } })
useUpdateStorageLogModuleMutation({ selection: { fields: { id: true } } })
useDeleteStorageLogModuleMutation({})
```

## Examples

### List all storageLogModules

```typescript
const { data, isLoading } = useStorageLogModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, storageLogTableId: true, storageLogTableName: true, usageDailyTableId: true, usageDailyTableName: true, interval: true, retention: true, premake: true, scope: true, actorFkTableId: true, entityFkTableId: true, prefix: true, apiName: true, privateApiName: true } },
});
```

### Create a storageLogModule

```typescript
const { mutate } = useCreateStorageLogModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', storageLogTableId: '<UUID>', storageLogTableName: '<String>', usageDailyTableId: '<UUID>', usageDailyTableName: '<String>', interval: '<String>', retention: '<String>', premake: '<Int>', scope: '<String>', actorFkTableId: '<UUID>', entityFkTableId: '<UUID>', prefix: '<String>', apiName: '<String>', privateApiName: '<String>' });
```
