# cryptoAddressesModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for CryptoAddressesModule records

## Usage

```typescript
db.cryptoAddressesModule.findMany({ select: { id: true } }).execute()
db.cryptoAddressesModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.cryptoAddressesModule.create({ data: { apiName: '<String>', cryptoNetwork: '<String>', databaseId: '<UUID>', ownerTableId: '<UUID>', privateApiName: '<String>', privateSchemaId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' }, select: { id: true } }).execute()
db.cryptoAddressesModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.cryptoAddressesModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all cryptoAddressesModule records

```typescript
const items = await db.cryptoAddressesModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a cryptoAddressesModule

```typescript
const item = await db.cryptoAddressesModule.create({
  data: { apiName: '<String>', cryptoNetwork: '<String>', databaseId: '<UUID>', ownerTableId: '<UUID>', privateApiName: '<String>', privateSchemaId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' },
  select: { id: true }
}).execute();
```
