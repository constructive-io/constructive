# merkleStoreModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for MerkleStoreModule records

## Usage

```typescript
db.merkleStoreModule.findMany({ select: { id: true } }).execute()
db.merkleStoreModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.merkleStoreModule.create({ data: { apiName: '<String>', commitTableId: '<UUID>', databaseId: '<UUID>', entityField: '<String>', functionPrefix: '<String>', objectTableId: '<UUID>', permissionKey: '<String>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', refTableId: '<UUID>', schemaId: '<UUID>', scope: '<String>', storeTableId: '<UUID>' }, select: { id: true } }).execute()
db.merkleStoreModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.merkleStoreModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all merkleStoreModule records

```typescript
const items = await db.merkleStoreModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a merkleStoreModule

```typescript
const item = await db.merkleStoreModule.create({
  data: { apiName: '<String>', commitTableId: '<UUID>', databaseId: '<UUID>', entityField: '<String>', functionPrefix: '<String>', objectTableId: '<UUID>', permissionKey: '<String>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', refTableId: '<UUID>', schemaId: '<UUID>', scope: '<String>', storeTableId: '<UUID>' },
  select: { id: true }
}).execute();
```
