# notificationsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for NotificationsModule records

## Usage

```typescript
db.notificationsModule.findMany({ select: { id: true } }).execute()
db.notificationsModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.notificationsModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', notificationsTableId: '<UUID>', eventsTableId: '<UUID>', preferencesTableId: '<UUID>', channelsTableId: '<UUID>', deliveryLogTableId: '<UUID>', ownerTableId: '<UUID>', userSettingsTableId: '<UUID>', organizationSettingsTableId: '<UUID>' }, select: { id: true } }).execute()
db.notificationsModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.notificationsModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all notificationsModule records

```typescript
const items = await db.notificationsModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a notificationsModule

```typescript
const item = await db.notificationsModule.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', notificationsTableId: '<UUID>', eventsTableId: '<UUID>', preferencesTableId: '<UUID>', channelsTableId: '<UUID>', deliveryLogTableId: '<UUID>', ownerTableId: '<UUID>', userSettingsTableId: '<UUID>', organizationSettingsTableId: '<UUID>' },
  select: { id: true }
}).execute();
```
