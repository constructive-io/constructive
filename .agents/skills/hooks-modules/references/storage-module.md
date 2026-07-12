# storageModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for StorageModule data operations

## Usage

```typescript
useStorageModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, bucketsTableId: true, filesTableId: true, bucketsTableName: true, filesTableName: true, scope: true, prefix: true, policies: true, provisions: true, entityTableId: true, entityField: true, endpoint: true, publicUrlPrefix: true, provider: true, allowedOrigins: true, restrictReads: true, hasPathShares: true, pathSharesTableId: true, uploadUrlExpirySeconds: true, downloadUrlExpirySeconds: true, defaultMaxFileSize: true, maxFilenameLength: true, cacheTtlSeconds: true, maxBulkFiles: true, maxBulkTotalSize: true, hasVersioning: true, hasContentHash: true, hasCustomKeys: true, hasAuditLog: true, hasConfirmUpload: true, confirmUploadDelay: true, fileEventsTableId: true, defaultPermissions: true, apiName: true, privateApiName: true } } })
useStorageModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, bucketsTableId: true, filesTableId: true, bucketsTableName: true, filesTableName: true, scope: true, prefix: true, policies: true, provisions: true, entityTableId: true, entityField: true, endpoint: true, publicUrlPrefix: true, provider: true, allowedOrigins: true, restrictReads: true, hasPathShares: true, pathSharesTableId: true, uploadUrlExpirySeconds: true, downloadUrlExpirySeconds: true, defaultMaxFileSize: true, maxFilenameLength: true, cacheTtlSeconds: true, maxBulkFiles: true, maxBulkTotalSize: true, hasVersioning: true, hasContentHash: true, hasCustomKeys: true, hasAuditLog: true, hasConfirmUpload: true, confirmUploadDelay: true, fileEventsTableId: true, defaultPermissions: true, apiName: true, privateApiName: true } } })
useCreateStorageModuleMutation({ selection: { fields: { id: true } } })
useUpdateStorageModuleMutation({ selection: { fields: { id: true } } })
useDeleteStorageModuleMutation({})
```

## Examples

### List all storageModules

```typescript
const { data, isLoading } = useStorageModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, bucketsTableId: true, filesTableId: true, bucketsTableName: true, filesTableName: true, scope: true, prefix: true, policies: true, provisions: true, entityTableId: true, entityField: true, endpoint: true, publicUrlPrefix: true, provider: true, allowedOrigins: true, restrictReads: true, hasPathShares: true, pathSharesTableId: true, uploadUrlExpirySeconds: true, downloadUrlExpirySeconds: true, defaultMaxFileSize: true, maxFilenameLength: true, cacheTtlSeconds: true, maxBulkFiles: true, maxBulkTotalSize: true, hasVersioning: true, hasContentHash: true, hasCustomKeys: true, hasAuditLog: true, hasConfirmUpload: true, confirmUploadDelay: true, fileEventsTableId: true, defaultPermissions: true, apiName: true, privateApiName: true } },
});
```

### Create a storageModule

```typescript
const { mutate } = useCreateStorageModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', bucketsTableId: '<UUID>', filesTableId: '<UUID>', bucketsTableName: '<String>', filesTableName: '<String>', scope: '<String>', prefix: '<String>', policies: '<JSON>', provisions: '<JSON>', entityTableId: '<UUID>', entityField: '<String>', endpoint: '<String>', publicUrlPrefix: '<String>', provider: '<String>', allowedOrigins: '<String>', restrictReads: '<Boolean>', hasPathShares: '<Boolean>', pathSharesTableId: '<UUID>', uploadUrlExpirySeconds: '<Int>', downloadUrlExpirySeconds: '<Int>', defaultMaxFileSize: '<BigInt>', maxFilenameLength: '<Int>', cacheTtlSeconds: '<Int>', maxBulkFiles: '<Int>', maxBulkTotalSize: '<BigInt>', hasVersioning: '<Boolean>', hasContentHash: '<Boolean>', hasCustomKeys: '<Boolean>', hasAuditLog: '<Boolean>', hasConfirmUpload: '<Boolean>', confirmUploadDelay: '<Interval>', fileEventsTableId: '<UUID>', defaultPermissions: '<String>', apiName: '<String>', privateApiName: '<String>' });
```
