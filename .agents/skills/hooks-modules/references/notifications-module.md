# notificationsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for NotificationsModule data operations

## Usage

```typescript
useNotificationsModulesQuery({ selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, notificationsTableId: true, readStateTableId: true, preferencesTableId: true, channelsTableId: true, deliveryLogTableId: true, suppressionsTableId: true, ownerTableId: true, userSettingsTableId: true, organizationSettingsTableId: true, hasChannels: true, hasPreferences: true, hasSettingsExtension: true, hasDigestMetadata: true, hasSubscriptions: true, defaultPermissions: true, apiName: true, privateApiName: true } } })
useNotificationsModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, notificationsTableId: true, readStateTableId: true, preferencesTableId: true, channelsTableId: true, deliveryLogTableId: true, suppressionsTableId: true, ownerTableId: true, userSettingsTableId: true, organizationSettingsTableId: true, hasChannels: true, hasPreferences: true, hasSettingsExtension: true, hasDigestMetadata: true, hasSubscriptions: true, defaultPermissions: true, apiName: true, privateApiName: true } } })
useCreateNotificationsModuleMutation({ selection: { fields: { id: true } } })
useUpdateNotificationsModuleMutation({ selection: { fields: { id: true } } })
useDeleteNotificationsModuleMutation({})
```

## Examples

### List all notificationsModules

```typescript
const { data, isLoading } = useNotificationsModulesQuery({
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, notificationsTableId: true, readStateTableId: true, preferencesTableId: true, channelsTableId: true, deliveryLogTableId: true, suppressionsTableId: true, ownerTableId: true, userSettingsTableId: true, organizationSettingsTableId: true, hasChannels: true, hasPreferences: true, hasSettingsExtension: true, hasDigestMetadata: true, hasSubscriptions: true, defaultPermissions: true, apiName: true, privateApiName: true } },
});
```

### Create a notificationsModule

```typescript
const { mutate } = useCreateNotificationsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', notificationsTableId: '<UUID>', readStateTableId: '<UUID>', preferencesTableId: '<UUID>', channelsTableId: '<UUID>', deliveryLogTableId: '<UUID>', suppressionsTableId: '<UUID>', ownerTableId: '<UUID>', userSettingsTableId: '<UUID>', organizationSettingsTableId: '<UUID>', hasChannels: '<Boolean>', hasPreferences: '<Boolean>', hasSettingsExtension: '<Boolean>', hasDigestMetadata: '<Boolean>', hasSubscriptions: '<Boolean>', defaultPermissions: '<String>', apiName: '<String>', privateApiName: '<String>' });
```
