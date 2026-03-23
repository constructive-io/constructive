# cryptoAddressesModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for CryptoAddressesModule records

## Usage

```typescript
db.cryptoAddressesModule.findMany({ select: { id: true } }).execute()
db.cryptoAddressesModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.cryptoAddressesModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', ownerTableId: '<UUID>', tableName: '<String>', cryptoNetwork: '<String>' }, select: { id: true } }).execute()
db.cryptoAddressesModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.cryptoAddressesModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all cryptoAddressesModule records

```typescript
const items = await db.cryptoAddressesModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a cryptoAddressesModule

```typescript
const item = await db.cryptoAddressesModule.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', ownerTableId: '<UUID>', tableName: '<String>', cryptoNetwork: '<String>' },
  select: { id: true }
}).execute();
```
