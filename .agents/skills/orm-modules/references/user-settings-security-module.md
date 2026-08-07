# userSettingsSecurityModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for UserSettingsSecurityModule records

## Usage

```typescript
db.userSettingsSecurityModule.findMany({ select: { id: true } }).execute()
db.userSettingsSecurityModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.userSettingsSecurityModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', ownerTableId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' }, select: { id: true } }).execute()
db.userSettingsSecurityModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.userSettingsSecurityModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all userSettingsSecurityModule records

```typescript
const items = await db.userSettingsSecurityModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a userSettingsSecurityModule

```typescript
const item = await db.userSettingsSecurityModule.create({
  data: { apiName: '<String>', databaseId: '<UUID>', ownerTableId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' },
  select: { id: true }
}).execute();
```
