# phoneNumbersModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for PhoneNumbersModule records

## Usage

```typescript
db.phoneNumbersModule.findMany({ select: { id: true } }).execute()
db.phoneNumbersModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.phoneNumbersModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', ownerTableId: '<UUID>', privateApiName: '<String>', privateSchemaId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' }, select: { id: true } }).execute()
db.phoneNumbersModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.phoneNumbersModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all phoneNumbersModule records

```typescript
const items = await db.phoneNumbersModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a phoneNumbersModule

```typescript
const item = await db.phoneNumbersModule.create({
  data: { apiName: '<String>', databaseId: '<UUID>', ownerTableId: '<UUID>', privateApiName: '<String>', privateSchemaId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' },
  select: { id: true }
}).execute();
```
