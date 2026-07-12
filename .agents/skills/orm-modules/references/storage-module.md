# storageModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for StorageModule records

## Usage

```typescript
db.storageModule.findMany({ select: { id: true } }).execute()
db.storageModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.storageModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', bucketsTableId: '<UUID>', filesTableId: '<UUID>', bucketsTableName: '<String>', filesTableName: '<String>', scope: '<String>', prefix: '<String>', policies: '<JSON>', provisions: '<JSON>', entityTableId: '<UUID>', entityField: '<String>', endpoint: '<String>', publicUrlPrefix: '<String>', provider: '<String>', allowedOrigins: '<String>', restrictReads: '<Boolean>', hasPathShares: '<Boolean>', pathSharesTableId: '<UUID>', uploadUrlExpirySeconds: '<Int>', downloadUrlExpirySeconds: '<Int>', defaultMaxFileSize: '<BigInt>', maxFilenameLength: '<Int>', cacheTtlSeconds: '<Int>', maxBulkFiles: '<Int>', maxBulkTotalSize: '<BigInt>', hasVersioning: '<Boolean>', hasContentHash: '<Boolean>', hasCustomKeys: '<Boolean>', hasAuditLog: '<Boolean>', hasConfirmUpload: '<Boolean>', confirmUploadDelay: '<Interval>', fileEventsTableId: '<UUID>', defaultPermissions: '<String>', apiName: '<String>', privateApiName: '<String>' }, select: { id: true } }).execute()
db.storageModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.storageModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all storageModule records

```typescript
const items = await db.storageModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a storageModule

```typescript
const item = await db.storageModule.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', bucketsTableId: '<UUID>', filesTableId: '<UUID>', bucketsTableName: '<String>', filesTableName: '<String>', scope: '<String>', prefix: '<String>', policies: '<JSON>', provisions: '<JSON>', entityTableId: '<UUID>', entityField: '<String>', endpoint: '<String>', publicUrlPrefix: '<String>', provider: '<String>', allowedOrigins: '<String>', restrictReads: '<Boolean>', hasPathShares: '<Boolean>', pathSharesTableId: '<UUID>', uploadUrlExpirySeconds: '<Int>', downloadUrlExpirySeconds: '<Int>', defaultMaxFileSize: '<BigInt>', maxFilenameLength: '<Int>', cacheTtlSeconds: '<Int>', maxBulkFiles: '<Int>', maxBulkTotalSize: '<BigInt>', hasVersioning: '<Boolean>', hasContentHash: '<Boolean>', hasCustomKeys: '<Boolean>', hasAuditLog: '<Boolean>', hasConfirmUpload: '<Boolean>', confirmUploadDelay: '<Interval>', fileEventsTableId: '<UUID>', defaultPermissions: '<String>', apiName: '<String>', privateApiName: '<String>' },
  select: { id: true }
}).execute();
```
