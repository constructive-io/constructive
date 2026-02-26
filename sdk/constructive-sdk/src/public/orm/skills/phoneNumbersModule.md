# orm-phoneNumbersModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for PhoneNumbersModule records

## Usage

```typescript
db.phoneNumbersModule.findMany({ select: { id: true } }).execute()
db.phoneNumbersModule.findOne({ where: { id: '<value>' }, select: { id: true } }).execute()
db.phoneNumbersModule.create({ data: { databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', tableId: '<value>', ownerTableId: '<value>', tableName: '<value>' }, select: { id: true } }).execute()
db.phoneNumbersModule.update({ where: { id: '<value>' }, data: { databaseId: '<new>' }, select: { id: true } }).execute()
db.phoneNumbersModule.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all phoneNumbersModule records

```typescript
const items = await db.phoneNumbersModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a phoneNumbersModule

```typescript
const item = await db.phoneNumbersModule.create({
  data: { databaseId: 'value', schemaId: 'value', privateSchemaId: 'value', tableId: 'value', ownerTableId: 'value', tableName: 'value' },
  select: { id: true }
}).execute();
```
