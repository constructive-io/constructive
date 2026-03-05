# cryptoAddressesModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for CryptoAddressesModule records

## Usage

```typescript
db.cryptoAddressesModule.findMany({ select: { id: true } }).execute()
db.cryptoAddressesModule.findOne({ id: '<value>', select: { id: true } }).execute()
db.cryptoAddressesModule.create({ data: { databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', tableId: '<value>', ownerTableId: '<value>', tableName: '<value>', cryptoNetwork: '<value>' }, select: { id: true } }).execute()
db.cryptoAddressesModule.update({ where: { id: '<value>' }, data: { databaseId: '<new>' }, select: { id: true } }).execute()
db.cryptoAddressesModule.delete({ where: { id: '<value>' } }).execute()
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
  data: { databaseId: 'value', schemaId: 'value', privateSchemaId: 'value', tableId: 'value', ownerTableId: 'value', tableName: 'value', cryptoNetwork: 'value' },
  select: { id: true }
}).execute();
```
