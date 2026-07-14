# notificationsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for NotificationsModule data operations

## Usage

```typescript
useNotificationsModulesQuery({ selection: { fields: { apiName: true, channelsTableId: true, databaseId: true, defaultPermissions: true, deliveryLogTableId: true, entityField: true, hasChannels: true, hasDigestMetadata: true, hasPreferences: true, hasSettingsExtension: true, hasSubscriptions: true, id: true, notificationsTableId: true, organizationSettingsTableId: true, ownerTableId: true, preferencesTableId: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, readStateTableId: true, schemaId: true, suppressionsTableId: true, userSettingsTableId: true } } })
useNotificationsModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, channelsTableId: true, databaseId: true, defaultPermissions: true, deliveryLogTableId: true, entityField: true, hasChannels: true, hasDigestMetadata: true, hasPreferences: true, hasSettingsExtension: true, hasSubscriptions: true, id: true, notificationsTableId: true, organizationSettingsTableId: true, ownerTableId: true, preferencesTableId: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, readStateTableId: true, schemaId: true, suppressionsTableId: true, userSettingsTableId: true } } })
useCreateNotificationsModuleMutation({ selection: { fields: { id: true } } })
useUpdateNotificationsModuleMutation({ selection: { fields: { id: true } } })
useDeleteNotificationsModuleMutation({})
```

## Examples

### List all notificationsModules

```typescript
const { data, isLoading } = useNotificationsModulesQuery({
  selection: { fields: { apiName: true, channelsTableId: true, databaseId: true, defaultPermissions: true, deliveryLogTableId: true, entityField: true, hasChannels: true, hasDigestMetadata: true, hasPreferences: true, hasSettingsExtension: true, hasSubscriptions: true, id: true, notificationsTableId: true, organizationSettingsTableId: true, ownerTableId: true, preferencesTableId: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, readStateTableId: true, schemaId: true, suppressionsTableId: true, userSettingsTableId: true } },
});
```

### Create a notificationsModule

```typescript
const { mutate } = useCreateNotificationsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', channelsTableId: '<UUID>', databaseId: '<UUID>', defaultPermissions: '<String>', deliveryLogTableId: '<UUID>', entityField: '<String>', hasChannels: '<Boolean>', hasDigestMetadata: '<Boolean>', hasPreferences: '<Boolean>', hasSettingsExtension: '<Boolean>', hasSubscriptions: '<Boolean>', notificationsTableId: '<UUID>', organizationSettingsTableId: '<UUID>', ownerTableId: '<UUID>', preferencesTableId: '<UUID>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', readStateTableId: '<UUID>', schemaId: '<UUID>', suppressionsTableId: '<UUID>', userSettingsTableId: '<UUID>' });
```
