# storageModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for StorageModule data operations

## Usage

```typescript
useStorageModulesQuery({ selection: { fields: { allowedOrigins: true, apiName: true, bucketsTableId: true, bucketsTableName: true, cacheTtlSeconds: true, confirmUploadDelay: true, databaseId: true, defaultMaxFileSize: true, defaultPermissions: true, downloadUrlExpirySeconds: true, endpoint: true, entityField: true, entityTableId: true, fileEventsTableId: true, filesTableId: true, filesTableName: true, hasAuditLog: true, hasConfirmUpload: true, hasContentHash: true, hasCustomKeys: true, hasPathShares: true, hasVersioning: true, id: true, maxBulkFiles: true, maxBulkTotalSize: true, maxFilenameLength: true, pathSharesTableId: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provider: true, provisions: true, publicSchemaName: true, publicUrlPrefix: true, restrictReads: true, schemaId: true, scope: true, uploadUrlExpirySeconds: true } } })
useStorageModuleQuery({ id: '<UUID>', selection: { fields: { allowedOrigins: true, apiName: true, bucketsTableId: true, bucketsTableName: true, cacheTtlSeconds: true, confirmUploadDelay: true, databaseId: true, defaultMaxFileSize: true, defaultPermissions: true, downloadUrlExpirySeconds: true, endpoint: true, entityField: true, entityTableId: true, fileEventsTableId: true, filesTableId: true, filesTableName: true, hasAuditLog: true, hasConfirmUpload: true, hasContentHash: true, hasCustomKeys: true, hasPathShares: true, hasVersioning: true, id: true, maxBulkFiles: true, maxBulkTotalSize: true, maxFilenameLength: true, pathSharesTableId: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provider: true, provisions: true, publicSchemaName: true, publicUrlPrefix: true, restrictReads: true, schemaId: true, scope: true, uploadUrlExpirySeconds: true } } })
useCreateStorageModuleMutation({ selection: { fields: { id: true } } })
useUpdateStorageModuleMutation({ selection: { fields: { id: true } } })
useDeleteStorageModuleMutation({})
```

## Examples

### List all storageModules

```typescript
const { data, isLoading } = useStorageModulesQuery({
  selection: { fields: { allowedOrigins: true, apiName: true, bucketsTableId: true, bucketsTableName: true, cacheTtlSeconds: true, confirmUploadDelay: true, databaseId: true, defaultMaxFileSize: true, defaultPermissions: true, downloadUrlExpirySeconds: true, endpoint: true, entityField: true, entityTableId: true, fileEventsTableId: true, filesTableId: true, filesTableName: true, hasAuditLog: true, hasConfirmUpload: true, hasContentHash: true, hasCustomKeys: true, hasPathShares: true, hasVersioning: true, id: true, maxBulkFiles: true, maxBulkTotalSize: true, maxFilenameLength: true, pathSharesTableId: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provider: true, provisions: true, publicSchemaName: true, publicUrlPrefix: true, restrictReads: true, schemaId: true, scope: true, uploadUrlExpirySeconds: true } },
});
```

### Create a storageModule

```typescript
const { mutate } = useCreateStorageModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ allowedOrigins: '<String>', apiName: '<String>', bucketsTableId: '<UUID>', bucketsTableName: '<String>', cacheTtlSeconds: '<Int>', confirmUploadDelay: '<Interval>', databaseId: '<UUID>', defaultMaxFileSize: '<BigInt>', defaultPermissions: '<String>', downloadUrlExpirySeconds: '<Int>', endpoint: '<String>', entityField: '<String>', entityTableId: '<UUID>', fileEventsTableId: '<UUID>', filesTableId: '<UUID>', filesTableName: '<String>', hasAuditLog: '<Boolean>', hasConfirmUpload: '<Boolean>', hasContentHash: '<Boolean>', hasCustomKeys: '<Boolean>', hasPathShares: '<Boolean>', hasVersioning: '<Boolean>', maxBulkFiles: '<Int>', maxBulkTotalSize: '<BigInt>', maxFilenameLength: '<Int>', pathSharesTableId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provider: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', publicUrlPrefix: '<String>', restrictReads: '<Boolean>', schemaId: '<UUID>', scope: '<String>', uploadUrlExpirySeconds: '<Int>' });
```
