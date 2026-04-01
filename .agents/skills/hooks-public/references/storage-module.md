# storageModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for StorageModule data operations

## Usage

```typescript
useStorageModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, bucketsTableId: true, filesTableId: true, uploadRequestsTableId: true, bucketsTableName: true, filesTableName: true, uploadRequestsTableName: true, entityTableId: true, uploadUrlExpirySeconds: true, downloadUrlExpirySeconds: true, defaultMaxFileSize: true, maxFilenameLength: true, cacheTtlSeconds: true } } })
useStorageModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, bucketsTableId: true, filesTableId: true, uploadRequestsTableId: true, bucketsTableName: true, filesTableName: true, uploadRequestsTableName: true, entityTableId: true, uploadUrlExpirySeconds: true, downloadUrlExpirySeconds: true, defaultMaxFileSize: true, maxFilenameLength: true, cacheTtlSeconds: true } } })
useCreateStorageModuleMutation({ selection: { fields: { id: true } } })
useUpdateStorageModuleMutation({ selection: { fields: { id: true } } })
useDeleteStorageModuleMutation({})
```

## Examples

### List all storageModules

```typescript
const { data, isLoading } = useStorageModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, bucketsTableId: true, filesTableId: true, uploadRequestsTableId: true, bucketsTableName: true, filesTableName: true, uploadRequestsTableName: true, entityTableId: true, uploadUrlExpirySeconds: true, downloadUrlExpirySeconds: true, defaultMaxFileSize: true, maxFilenameLength: true, cacheTtlSeconds: true } },
});
```

### Create a storageModule

```typescript
const { mutate } = useCreateStorageModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', bucketsTableId: '<UUID>', filesTableId: '<UUID>', uploadRequestsTableId: '<UUID>', bucketsTableName: '<String>', filesTableName: '<String>', uploadRequestsTableName: '<String>', entityTableId: '<UUID>', uploadUrlExpirySeconds: '<Int>', downloadUrlExpirySeconds: '<Int>', defaultMaxFileSize: '<BigInt>', maxFilenameLength: '<Int>', cacheTtlSeconds: '<Int>' });
```
