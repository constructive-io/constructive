# notificationsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for NotificationsModule records

## Usage

```typescript
db.notificationsModule.findMany({ select: { id: true } }).execute()
db.notificationsModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.notificationsModule.create({ data: { apiName: '<String>', channelsTableId: '<UUID>', databaseId: '<UUID>', defaultPermissions: '<String>', deliveryLogTableId: '<UUID>', entityField: '<String>', hasChannels: '<Boolean>', hasDigestMetadata: '<Boolean>', hasPreferences: '<Boolean>', hasSettingsExtension: '<Boolean>', hasSubscriptions: '<Boolean>', notificationsTableId: '<UUID>', organizationSettingsTableId: '<UUID>', ownerTableId: '<UUID>', preferencesTableId: '<UUID>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', readStateTableId: '<UUID>', schemaId: '<UUID>', suppressionsTableId: '<UUID>', userSettingsTableId: '<UUID>' }, select: { id: true } }).execute()
db.notificationsModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.notificationsModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all notificationsModule records

```typescript
const items = await db.notificationsModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a notificationsModule

```typescript
const item = await db.notificationsModule.create({
  data: { apiName: '<String>', channelsTableId: '<UUID>', databaseId: '<UUID>', defaultPermissions: '<String>', deliveryLogTableId: '<UUID>', entityField: '<String>', hasChannels: '<Boolean>', hasDigestMetadata: '<Boolean>', hasPreferences: '<Boolean>', hasSettingsExtension: '<Boolean>', hasSubscriptions: '<Boolean>', notificationsTableId: '<UUID>', organizationSettingsTableId: '<UUID>', ownerTableId: '<UUID>', preferencesTableId: '<UUID>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', readStateTableId: '<UUID>', schemaId: '<UUID>', suppressionsTableId: '<UUID>', userSettingsTableId: '<UUID>' },
  select: { id: true }
}).execute();
```
