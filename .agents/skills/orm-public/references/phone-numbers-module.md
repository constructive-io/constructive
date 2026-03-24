# phoneNumbersModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for PhoneNumbersModule records

## Usage

```typescript
db.phoneNumbersModule.findMany({ select: { id: true } }).execute()
db.phoneNumbersModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.phoneNumbersModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', ownerTableId: '<UUID>', tableName: '<String>' }, select: { id: true } }).execute()
db.phoneNumbersModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.phoneNumbersModule.delete({ where: { id: '<UUID>' } }).execute()
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
  data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', ownerTableId: '<UUID>', tableName: '<String>' },
  select: { id: true }
}).execute();
```
