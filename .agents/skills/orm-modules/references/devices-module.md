# devicesModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for DevicesModule records

## Usage

```typescript
db.devicesModule.findMany({ select: { id: true } }).execute()
db.devicesModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.devicesModule.create({ data: { databaseId: '<UUID>', deviceSettingsTableId: '<UUID>', deviceSettingsTableName: '<String>', schemaId: '<UUID>', userDevicesTableId: '<UUID>', userDevicesTableName: '<String>' }, select: { id: true } }).execute()
db.devicesModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.devicesModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all devicesModule records

```typescript
const items = await db.devicesModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a devicesModule

```typescript
const item = await db.devicesModule.create({
  data: { databaseId: '<UUID>', deviceSettingsTableId: '<UUID>', deviceSettingsTableName: '<String>', schemaId: '<UUID>', userDevicesTableId: '<UUID>', userDevicesTableName: '<String>' },
  select: { id: true }
}).execute();
```
