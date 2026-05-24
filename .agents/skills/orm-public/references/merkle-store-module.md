# merkleStoreModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for MerkleStoreModule records

## Usage

```typescript
db.merkleStoreModule.findMany({ select: { id: true } }).execute()
db.merkleStoreModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.merkleStoreModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', publicSchemaName: '<String>', objectTableId: '<UUID>', storeTableId: '<UUID>', commitTableId: '<UUID>', refTableId: '<UUID>', prefix: '<String>', apiName: '<String>', scopeField: '<String>' }, select: { id: true } }).execute()
db.merkleStoreModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.merkleStoreModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all merkleStoreModule records

```typescript
const items = await db.merkleStoreModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a merkleStoreModule

```typescript
const item = await db.merkleStoreModule.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', publicSchemaName: '<String>', objectTableId: '<UUID>', storeTableId: '<UUID>', commitTableId: '<UUID>', refTableId: '<UUID>', prefix: '<String>', apiName: '<String>', scopeField: '<String>' },
  select: { id: true }
}).execute();
```
