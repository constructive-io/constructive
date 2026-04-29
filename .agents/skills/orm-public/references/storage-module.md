# storageModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for StorageModule records

## Usage

```typescript
db.storageModule.findMany({ select: { id: true } }).execute()
db.storageModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.storageModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', bucketsTableId: '<UUID>', filesTableId: '<UUID>', uploadRequestsTableId: '<UUID>', bucketsTableName: '<String>', filesTableName: '<String>', uploadRequestsTableName: '<String>', membershipType: '<Int>', policies: '<JSON>', entityTableId: '<UUID>', endpoint: '<String>', publicUrlPrefix: '<String>', provider: '<String>', allowedOrigins: '<String>', uploadUrlExpirySeconds: '<Int>', downloadUrlExpirySeconds: '<Int>', defaultMaxFileSize: '<BigInt>', maxFilenameLength: '<Int>', cacheTtlSeconds: '<Int>' }, select: { id: true } }).execute()
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
  data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', bucketsTableId: '<UUID>', filesTableId: '<UUID>', uploadRequestsTableId: '<UUID>', bucketsTableName: '<String>', filesTableName: '<String>', uploadRequestsTableName: '<String>', membershipType: '<Int>', policies: '<JSON>', entityTableId: '<UUID>', endpoint: '<String>', publicUrlPrefix: '<String>', provider: '<String>', allowedOrigins: '<String>', uploadUrlExpirySeconds: '<Int>', downloadUrlExpirySeconds: '<Int>', defaultMaxFileSize: '<BigInt>', maxFilenameLength: '<Int>', cacheTtlSeconds: '<Int>' },
  select: { id: true }
}).execute();
```
