# userSettingsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for UserSettingsModule records

## Usage

```typescript
db.userSettingsModule.findMany({ select: { id: true } }).execute()
db.userSettingsModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.userSettingsModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', ownerTableId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' }, select: { id: true } }).execute()
db.userSettingsModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.userSettingsModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all userSettingsModule records

```typescript
const items = await db.userSettingsModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a userSettingsModule

```typescript
const item = await db.userSettingsModule.create({
  data: { apiName: '<String>', databaseId: '<UUID>', ownerTableId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' },
  select: { id: true }
}).execute();
```
