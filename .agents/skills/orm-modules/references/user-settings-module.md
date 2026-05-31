# userSettingsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for UserSettingsModule records

## Usage

```typescript
db.userSettingsModule.findMany({ select: { id: true } }).execute()
db.userSettingsModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.userSettingsModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', ownerTableId: '<UUID>', tableName: '<String>', apiName: '<String>' }, select: { id: true } }).execute()
db.userSettingsModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.userSettingsModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all userSettingsModule records

```typescript
const items = await db.userSettingsModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a userSettingsModule

```typescript
const item = await db.userSettingsModule.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', ownerTableId: '<UUID>', tableName: '<String>', apiName: '<String>' },
  select: { id: true }
}).execute();
```
